import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Layout } from '../layout/Layout';
import { backupApi, Backup, BackupSettings, BackupStats, PointInTime } from '../../lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Database,
  RefreshCw,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Cloud,
  HardDrive,
  Shield,
  Calendar,
  AlertTriangle,
  Play,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Zap,
  Server,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts';

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [settings, setSettings] = useState<BackupSettings>({
    enabled: false,
    frequency: 'daily',
    retention: 30,
    storageLocation: 'local',
    autoVerify: false
  });
  const [pointsInTime, setPointsInTime] = useState<PointInTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupLocation, setNewBackupLocation] = useState<string>('local');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [backupsRes, statsRes, settingsRes, pointsRes] = await Promise.all([
        backupApi.getAll(),
        backupApi.getStats(),
        backupApi.getSettings(),
        backupApi.getPointsInTime()
      ]);
      
      if (backupsRes.success) setBackups(backupsRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (settingsRes.success && settingsRes.data) setSettings(settingsRes.data);
      if (pointsRes.success) setPointsInTime(pointsRes.data);
    } catch (error) {
      console.error('Failed to load backup data:', error);
      toast.error('Failed to load backup data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await backupApi.create({
        name: newBackupName || `Backup_${new Date().toISOString().replace(/[:.]/g, '-')}`,
        storageLocation: newBackupLocation as any,
        type: 'manual'
      });
      toast.success('Backup initiated successfully - check back in a few seconds for completion');
      setShowCreateDialog(false);
      setNewBackupName('');
      // Refresh after a delay to allow backup to complete
      setTimeout(() => {
        loadData();
      }, 5000);
    } catch (error) {
      console.error('Failed to create backup:', error);
      toast.error('Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await backupApi.restore(id);
      toast.success('Restore process initiated');
      setShowRestoreDialog(false);
      loadData();
    } catch (error) {
      console.error('Failed to restore:', error);
      toast.error('Failed to initiate restore');
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await backupApi.verify(id);
      toast.success('Verification initiated');
      loadData();
    } catch (error) {
      console.error('Failed to verify:', error);
      toast.error('Failed to initiate verification');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;
    
    try {
      await backupApi.delete(id);
      toast.success('Backup deleted');
      loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete backup');
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const blob = await backupApi.download(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${id}.json.gz`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Backup downloaded');
    } catch (error) {
      console.error('Failed to download:', error);
      toast.error('Failed to download backup');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const settingsToSave: BackupSettings = {
        enabled: settings.enabled,
        frequency: settings.frequency,
        retention: settings.retention,
        storageLocation: settings.storageLocation,
        autoVerify: settings.autoVerify,
        cloudConfig: settings.cloudConfig
      };
      await backupApi.updateSettings(settingsToSave);
      toast.success('Settings saved successfully');
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'verified':
        return <Badge variant="default" className="bg-blue-500"><Shield className="w-3 h-3 mr-1" /> Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'restoring':
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Restoring</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const STATUS_COLORS: Record<string, string> = {
    completed: '#10b981',
    verified: '#3b82f6',
    pending: '#f59e0b',
    in_progress: '#8b5cf6',
    failed: '#ef4444',
    restoring: '#ec4899',
  };

  const STORAGE_COLORS: Record<string, string> = {
    local: '#64748b',
    s3: '#f59e0b',
    'google-drive': '#10b981',
    dropbox: '#3b82f6',
    cloud: '#8b5cf6',
  };

  interface MetricTileProps {
    title: string;
    value: number | string;
    icon: ReactNode;
    tone: 'blue' | 'emerald' | 'red' | 'amber' | 'violet';
    subtitle?: string;
    loading?: boolean;
  }

  const toneClass = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
    red: 'bg-red-50 text-red-600 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60',
  };

  function MetricTile({ title, value, icon, tone, subtitle, loading }: MetricTileProps) {
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
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {title}
              </p>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
            </div>
            <div className={`rounded-lg p-2.5 ring-1 ${toneClass[tone]}`}>
              {icon}
            </div>
          </div>
          {subtitle && (
            <div className="mt-3 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    backups.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value,
      fill: STATUS_COLORS[name] || '#64748b',
    }));
  }, [backups]);

  const storageChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    backups.forEach(b => { counts[b.storageLocation || 'local'] = (counts[b.storageLocation || 'local'] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: STORAGE_COLORS[name] || '#64748b',
    }));
  }, [backups]);

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-foreground dark:text-white">Loading...</div>
      </Layout>
    );
  }

  const totalBackups = stats?.totalBackups ?? 0;
  const verifiedBackups = stats?.verifiedBackups ?? 0;
  const failedBackups = stats?.failedBackups ?? 0;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1700px] w-full space-y-6">

          {/* Hero Header */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm dark:border-slate-800">
            <div className="p-6 lg:p-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-white/10 text-white hover:bg-white/10">
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      Data Protection Center
                    </Badge>
                    {stats?.failedBackups && stats.failedBackups > 0 && (
                      <Badge className="bg-red-500/20 text-red-200 hover:bg-red-500/20">
                        {stats.failedBackups} Failed
                      </Badge>
                    )}
                    {settings.enabled && (
                      <Badge className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20">
                        Auto ({settings.frequency})
                      </Badge>
                    )}
                  </div>
                  <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                    Backup & Restore
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                    Manage automated and manual backups, verify integrity, and restore to any point in time.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    onClick={() => setShowSettings(true)}
                  >
                    <Shield className="h-4 w-4" />
                    <span className="ml-1.5 hidden sm:inline">Settings</span>
                  </Button>
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700">
                        <Database className="h-4 w-4" />
                        <span className="ml-1.5 hidden sm:inline">Create Backup</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="overflow-hidden border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-950 sm:max-w-md">
                      <div className="bg-slate-950 p-6 text-white">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-violet-500/20 p-2.5 ring-1 ring-violet-500/30">
                            <Database className="h-5 w-5 text-violet-300" />
                          </div>
                          <div>
                            <DialogTitle className="text-lg text-white">Create New Backup</DialogTitle>
                            <DialogDescription className="mt-0.5 text-slate-400">
                              Save a snapshot of your data
                            </DialogDescription>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-5 p-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Backup Name <span className="text-slate-400 font-normal">(optional)</span></Label>
                          <Input
                            value={newBackupName}
                            onChange={(e) => setNewBackupName(e.target.value)}
                            placeholder="e.g. Weekly Backup"
                            className="border-slate-200 bg-white text-slate-900 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Storage Location</Label>
                          <Select value={newBackupLocation} onValueChange={setNewBackupLocation}>
                            <SelectTrigger className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                              <SelectItem value="local">💾 Local Storage</SelectItem>
                              <SelectItem value="cloud">☁️ Cloud Storage</SelectItem>
                              <SelectItem value="s3">🪣 Amazon S3</SelectItem>
                              <SelectItem value="google-drive">📁 Google Drive</SelectItem>
                              <SelectItem value="dropbox">📦 Dropbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newBackupLocation !== 'local' && (
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>Cloud credentials must be configured in Settings before using this storage target.</p>
                          </div>
                        )}
                      </div>
                      <DialogFooter className="gap-2 border-t border-slate-100 p-4 dark:border-slate-800 sm:justify-end">
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                          Cancel
                        </Button>
                        <Button onClick={handleCreateBackup} disabled={creating} className="bg-violet-600 text-white hover:bg-violet-700">
                          {creating ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Creating...
                            </>
                          ) : (
                            <>
                              <Database className="mr-2 h-4 w-4" /> Create Backup
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Mini stats in header */}
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Backup Health</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-4xl font-bold">
                      {totalBackups > 0 ? Math.round((verifiedBackups / totalBackups) * 100) : 0}%
                    </p>
                    <ShieldCheck className="h-6 w-6 text-emerald-300" />
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-emerald-400"
                      style={{ width: `${totalBackups > 0 ? (verifiedBackups / totalBackups) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Total Size</p>
                  <p className="mt-3 text-3xl font-bold">{stats?.formattedTotalSize || '0 B'}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {totalBackups} backups stored
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Last Backup</p>
                  <p className="mt-3 text-2xl font-bold">
                    {stats?.lastBackup ? formatDate(stats.lastBackup).split(',')[0] : 'Never'}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {settings.enabled ? `Next: ${settings.frequency}` : 'Auto-backup disabled'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              title="Total Backups"
              value={stats?.totalBackups ?? 0}
              icon={<Database className="h-5 w-5" />}
              tone="blue"
              subtitle={`${stats?.completedBackups ?? 0} completed, ${stats?.failedBackups ?? 0} failed`}
              loading={loading}
            />
            <MetricTile
              title="Total Size"
              value={stats?.formattedTotalSize || '0 B'}
              icon={<Server className="h-5 w-5" />}
              tone="violet"
              subtitle="Across all backups"
              loading={loading}
            />
            <MetricTile
              title="Verified"
              value={stats?.verifiedBackups ?? 0}
              icon={<CheckCircle className="h-5 w-5" />}
              tone="emerald"
              subtitle="Integrity verified"
              loading={loading}
            />
            <MetricTile
              title="Retention"
              value={`${settings.retention}d`}
              icon={<Clock className="h-5 w-5" />}
              tone="amber"
              subtitle={settings.enabled ? `Auto ${settings.frequency}` : 'Auto disabled'}
              loading={loading}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Status Breakdown */}
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Backup Status
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Distribution by completion state
                </p>
              </CardHeader>
              <CardContent>
                {statusChartData.length === 0 ? (
                  <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                    <Database className="h-8 w-8 mb-2 text-slate-400 dark:text-slate-500" />
                    <p className="text-sm">No backup data</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_140px] items-center gap-4">
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <ReTooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.9)',
                              border: '1px solid rgba(51, 65, 85, 0.5)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '12px',
                            }}
                          />
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                            nameKey="name"
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {statusChartData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-2 text-sm">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                          <span className="text-slate-600 dark:text-slate-300 truncate">{entry.name}</span>
                          <span className="ml-auto font-bold text-slate-900 dark:text-white">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Storage Distribution */}
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  Storage Locations
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Backups per storage target
                </p>
              </CardHeader>
              <CardContent>
                {storageChartData.length === 0 ? (
                  <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                    <Cloud className="h-8 w-8 mb-2 text-slate-400 dark:text-slate-500" />
                    <p className="text-sm">No storage data</p>
                  </div>
                ) : (
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={storageChartData} layout="vertical" margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(148,163,184,0.2)" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <ReTooltip
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid rgba(51, 65, 85, 0.5)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                          {storageChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Backup + Point-in-Time */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Quick Backup
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  Select storage and create a backup instantly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={newBackupLocation} onValueChange={setNewBackupLocation}>
                  <SelectTrigger className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Select storage" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectItem value="local">💾 Local Storage</SelectItem>
                    <SelectItem value="s3">☁️ Amazon S3</SelectItem>
                    <SelectItem value="google-drive">📁 Google Drive</SelectItem>
                    <SelectItem value="dropbox">📦 Dropbox</SelectItem>
                  </SelectContent>
                </Select>
                {newBackupLocation !== 'local' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Configure cloud credentials in Settings before using cloud storage
                  </p>
                )}
                <Button
                  onClick={() => {
                    setNewBackupName(`Backup_${new Date().toISOString().replace(/[:.]/g, '-')}`);
                    setShowCreateDialog(true);
                  }}
                  className="w-full"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Create Backup Now
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Point-in-Time Recovery
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  Available recovery points
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pointsInTime.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 py-8 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                    <Calendar className="h-8 w-8 mb-2 text-slate-400 dark:text-slate-500" />
                    <p className="text-sm">No recovery points yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {pointsInTime.slice(0, 6).map((point) => (
                      <div key={point.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{point.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {formatDate(point.timestamp)} · {formatFileSize(point.fileSize)} · {point.totalDocuments} docs
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBackup(backups.find(b => b._id === point.id) || null);
                            setShowRestoreDialog(true);
                          }}
                        >
                          <Play className="h-3.5 w-3.5 mr-1" />
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Backup History */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                <HardDrive className="h-4 w-4 text-indigo-500" />
                Backup History
              </CardTitle>
              <CardDescription className="dark:text-slate-400">
                View and manage your existing backups
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {backups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Database className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No backups found</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    Create your first backup to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/80">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Size</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Verification</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup._id} className="group dark:hover:bg-slate-800/60">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div
                                className="h-8 w-1 rounded-full shrink-0"
                                style={{ backgroundColor: STATUS_COLORS[backup.status] || 'transparent' }}
                              />
                              <span className="font-medium text-sm text-slate-800 dark:text-white">{backup.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                              {backup.type === 'manual' && <HardDrive className="h-3 w-3 mr-1" />}
                              {backup.type === 'automated' && <RefreshCw className="h-3 w-3 mr-1" />}
                              {backup.type === 'scheduled' && <Clock className="h-3 w-3 mr-1" />}
                              {backup.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(backup.status)}</TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-300">{formatFileSize(backup.fileSize)}</TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-300">{formatDate(backup.createdAt)}</TableCell>
                          <TableCell>
                            {backup.verification?.verified ? (
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : backup.verification?.integrityStatus === 'corrupted' ? (
                              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                                <XCircle className="h-3 w-3 mr-1" />
                                Corrupted
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">Not verified</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {backup.status === 'completed' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Verify"
                                    onClick={() => handleVerify(backup._id)}
                                    className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                  >
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Restore"
                                    onClick={() => {
                                      setSelectedBackup(backup);
                                      setShowRestoreDialog(true);
                                    }}
                                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Download"
                                    onClick={() => handleDownload(backup._id)}
                                    className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete"
                                onClick={() => handleDelete(backup._id)}
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="overflow-hidden border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-950 sm:max-w-lg">
          <div className="bg-slate-950 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-500/20 p-2.5 ring-1 ring-indigo-500/30">
                <Shield className="h-5 w-5 text-indigo-300" />
              </div>
              <div>
                <DialogTitle className="text-lg text-white">Backup Settings</DialogTitle>
                <DialogDescription className="mt-0.5 text-slate-400">
                  Configure schedule, retention, and cloud storage
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="max-h-[60vh] space-y-6 overflow-y-auto p-6">
            {/* Automation Section */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <RefreshCw className="h-3.5 w-3.5" /> Automation
              </h4>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-slate-800 dark:text-slate-200">Enable Automated Backups</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Run backups on a schedule automatically</p>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Backup Frequency</Label>
                <Select
                  value={settings.frequency}
                  onValueChange={(value: any) => setSettings({ ...settings, frequency: value })}
                  disabled={!settings.enabled}
                >
                  <SelectTrigger className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Retention Period <span className="font-normal text-slate-400">(days)</span></Label>
                <Input
                  type="number"
                  value={settings.retention}
                  onChange={(e) => setSettings({ ...settings, retention: parseInt(e.target.value) })}
                  min={1}
                  max={365}
                  className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">Backups older than this will be auto-deleted</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-slate-800 dark:text-slate-200">Auto-Verify Backups</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Check integrity automatically after backup</p>
                  </div>
                  <Switch
                    checked={settings.autoVerify}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoVerify: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Storage Section */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <HardDrive className="h-3.5 w-3.5" /> Storage
              </h4>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Storage Location</Label>
                <Select
                  value={settings.storageLocation}
                  onValueChange={(value: any) => setSettings({ ...settings, storageLocation: value })}
                >
                  <SelectTrigger className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                    <SelectItem value="local">💾 Local Storage</SelectItem>
                    <SelectItem value="s3">🪣 Amazon S3</SelectItem>
                    <SelectItem value="google-drive">📁 Google Drive</SelectItem>
                    <SelectItem value="dropbox">📦 Dropbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cloud Credentials Section */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Cloud className="h-3.5 w-3.5" /> Cloud Credentials
              </h4>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cloud Provider</Label>
                  <Select
                    value={settings.cloudConfig?.provider || 'local'}
                    onValueChange={(value: any) => setSettings({
                      ...settings,
                      cloudConfig: {
                        provider: value,
                        bucket: settings.cloudConfig?.bucket || '',
                        region: settings.cloudConfig?.region || ''
                      }
                    })}
                  >
                    <SelectTrigger className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                      <SelectItem value="local">Local (No cloud)</SelectItem>
                      <SelectItem value="aws">Amazon S3</SelectItem>
                      <SelectItem value="gcp">Google Cloud Storage</SelectItem>
                      <SelectItem value="azure">Microsoft Azure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bucket / Container Name</Label>
                  <Input
                    value={settings.cloudConfig?.bucket || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      cloudConfig: {
                        provider: settings.cloudConfig?.provider || 'aws',
                        bucket: e.target.value,
                        region: settings.cloudConfig?.region || ''
                      }
                    })}
                    placeholder="my-backup-bucket"
                    className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Region</Label>
                  <Input
                    value={settings.cloudConfig?.region || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      cloudConfig: {
                        provider: settings.cloudConfig?.provider || 'aws',
                        bucket: settings.cloudConfig?.bucket || '',
                        region: e.target.value
                      }
                    })}
                    placeholder="us-east-1"
                    className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-100 p-4 dark:border-slate-800 sm:justify-end">
            <Button variant="outline" onClick={() => setShowSettings(false)} className="border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-indigo-600 text-white hover:bg-indigo-700">
              {savingSettings ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" /> Save Settings
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Confirm Restore
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Are you sure you want to restore from this backup? This will replace all current data with the backup data.
            </DialogDescription>
          </DialogHeader>
          {selectedBackup && (
            <div className="py-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Backup:</strong> {selectedBackup.name}<br />
                  <strong>Date:</strong> {formatDate(selectedBackup.createdAt)}<br />
                  <strong>Size:</strong> {formatFileSize(selectedBackup.fileSize)}<br />
                  <strong>Collections:</strong> {selectedBackup.collections?.length || 0}
                </p>
              </div>
              <p className="text-sm text-muted-foreground dark:text-slate-400 mt-4">
                This action cannot be undone. We recommend creating a backup of your current data before proceeding.
              </p>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)} className="w-full sm:w-auto dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedBackup && handleRestore(selectedBackup._id)}
              className="w-full sm:w-auto"
            >
              Restore Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
