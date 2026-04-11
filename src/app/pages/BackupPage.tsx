import { useState, useEffect } from 'react';
import { Layout } from '../layout/Layout';
import { backupApi, Backup, BackupSettings, BackupStats, PointInTime } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
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
  Play
} from 'lucide-react';

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

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-foreground dark:text-white">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-white">Backup & Restore</h1>
            <p className="text-muted-foreground dark:text-slate-400">Manage your data backups and recovery options</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSettings(true)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              <Shield className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="dark:bg-primary dark:text-primary-foreground">
                  <Database className="w-4 h-4 mr-2" />
                  Create Backup
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-slate-800">
                <DialogHeader>
                  <DialogTitle className="dark:text-white">Create New Backup</DialogTitle>
                  <DialogDescription className="dark:text-slate-400">Create a new backup of your data</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Backup Name (optional)</Label>
                    <Input 
                      value={newBackupName}
                      onChange={(e) => setNewBackupName(e.target.value)}
                      placeholder="My Backup"
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Storage Location</Label>
                    <Select value={newBackupLocation} onValueChange={setNewBackupLocation}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="local" className="dark:text-slate-200">Local Storage</SelectItem>
                        <SelectItem value="cloud" className="dark:text-slate-200">Cloud Storage</SelectItem>
                        <SelectItem value="s3" className="dark:text-slate-200">Amazon S3</SelectItem>
                        <SelectItem value="google-drive" className="dark:text-slate-200">Google Drive</SelectItem>
                        <SelectItem value="dropbox" className="dark:text-slate-200">Dropbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="w-full sm:w-auto dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Cancel</Button>
                  <Button onClick={handleCreateBackup} disabled={creating} className="w-full sm:w-auto">
                    {creating ? 'Creating...' : 'Create Backup'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-slate-400">Total Backups</CardDescription>
              <CardTitle className="text-3xl dark:text-white">{stats?.totalBackups || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground dark:text-slate-400">
                {stats?.completedBackups || 0} completed, {stats?.failedBackups || 0} failed
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-slate-400">Total Size</CardDescription>
              <CardTitle className="text-3xl dark:text-white">{stats?.formattedTotalSize || '0 B'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground dark:text-slate-400">
                Across all backups
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-slate-400">Verified</CardDescription>
              <CardTitle className="text-3xl text-green-500 dark:text-green-400">{stats?.verifiedBackups || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground dark:text-slate-400">
                Backups with integrity verified
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-slate-400">Last Backup</CardDescription>
              <CardTitle className="text-xl dark:text-white">
                {stats?.lastBackup ? formatDate(stats.lastBackup) : 'Never'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground dark:text-slate-400">
                {settings.enabled ? `Next: ${settings.frequency}` : 'Auto-backup disabled'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Storage Location Selector */}
        <Card className="dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Cloud className="w-5 h-5" />
              Quick Backup
            </CardTitle>
            <CardDescription className="dark:text-slate-400">Select storage location and create a backup instantly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 w-full sm:w-auto">
                <Label className="mb-2 block dark:text-slate-200">Storage Location</Label>
                <Select value={newBackupLocation} onValueChange={setNewBackupLocation}>
                  <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                    <SelectValue placeholder="Select storage" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="local" className="dark:text-slate-200">💾 Local Storage</SelectItem>
                    <SelectItem value="s3" className="dark:text-slate-200">☁️ Amazon S3</SelectItem>
                    <SelectItem value="google-drive" className="dark:text-slate-200">📁 Google Drive</SelectItem>
                    <SelectItem value="dropbox" className="dark:text-slate-200">📦 Dropbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => {
                  setNewBackupName(`Backup_${new Date().toISOString().replace(/[:.]/g, '-')}`);
                  setShowCreateDialog(true);
                }} 
                className="w-full sm:w-auto"
                size="lg"
              >
                <Database className="w-4 h-4 mr-2" />
                Create Backup Now ({newBackupLocation})
              </Button>
            </div>
            {newBackupLocation !== 'local' && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                ⚠️ Configure cloud credentials in Settings before using cloud storage
              </p>
            )}
          </CardContent>
        </Card>

        {/* Point-in-Time Recovery */}
        <Card className="dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Calendar className="w-5 h-5" />
              Point-in-Time Recovery
            </CardTitle>
            <CardDescription className="dark:text-slate-400">Available recovery points for restoring data to a specific time</CardDescription>
          </CardHeader>
          <CardContent>
            {pointsInTime.length === 0 ? (
              <p className="text-muted-foreground dark:text-slate-400 text-center py-4">No backup points available</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pointsInTime.slice(0, 6).map((point) => (
                  <div key={point.id} className="border rounded-lg p-4 space-y-2 dark:border-slate-600 dark:bg-slate-700/50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium dark:text-white">{point.name}</span>
                      <Badge variant="outline" className="dark:border-slate-500 dark:text-slate-300">{formatFileSize(point.fileSize)}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground dark:text-slate-400">
                      {formatDate(point.timestamp)}
                    </div>
                    <div className="text-sm text-muted-foreground dark:text-slate-400">
                      {point.totalDocuments} documents
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => {
                        setSelectedBackup(backups.find(b => b._id === point.id) || null);
                        setShowRestoreDialog(true);
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Restore to this point
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backup History */}
        <Card className="dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <HardDrive className="w-5 h-5" />
              Backup History
            </CardTitle>
            <CardDescription className="dark:text-slate-400">View and manage your existing backups</CardDescription>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <p className="text-muted-foreground dark:text-slate-400 text-center py-8">No backups found. Create your first backup!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-slate-600">
                    <TableHead className="dark:text-slate-300">Name</TableHead>
                    <TableHead className="dark:text-slate-300">Type</TableHead>
                    <TableHead className="dark:text-slate-300">Status</TableHead>
                    <TableHead className="dark:text-slate-300">Size</TableHead>
                    <TableHead className="dark:text-slate-300">Date</TableHead>
                    <TableHead className="dark:text-slate-300">Verification</TableHead>
                    <TableHead className="text-right dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup._id} className="dark:border-slate-600">
                      <TableCell className="font-medium dark:text-white">{backup.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="dark:border-slate-500 dark:text-slate-300">
                          {backup.type === 'manual' && <HardDrive className="w-3 h-3 mr-1" />}
                          {backup.type === 'automated' && <RefreshCw className="w-3 h-3 mr-1" />}
                          {backup.type === 'scheduled' && <Clock className="w-3 h-3 mr-1" />}
                          {backup.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(backup.status)}</TableCell>
                      <TableCell className="dark:text-slate-300">{formatFileSize(backup.fileSize)}</TableCell>
                      <TableCell className="dark:text-slate-300">{formatDate(backup.createdAt)}</TableCell>
                      <TableCell>
                        {backup.verification?.verified ? (
                          <Badge variant="default" className="bg-green-500 dark:bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : backup.verification?.integrityStatus === 'corrupted' ? (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Corrupted
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="dark:bg-slate-600 dark:text-slate-200">Not verified</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {backup.status === 'completed' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Verify"
                                onClick={() => handleVerify(backup._id)}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <Shield className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Restore"
                                onClick={() => {
                                  setSelectedBackup(backup);
                                  setShowRestoreDialog(true);
                                }}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Download"
                                onClick={() => handleDownload(backup._id)}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Delete"
                            onClick={() => handleDelete(backup._id)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Backup Settings</DialogTitle>
              <DialogDescription className="dark:text-slate-400">Configure automated backup schedule and cloud storage credentials</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Enable Automated Backups</Label>
                    <p className="text-sm text-muted-foreground dark:text-slate-400">Automatically backup your data on a schedule</p>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                    className="dark:bg-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Backup Frequency</Label>
                  <Select 
                    value={settings.frequency} 
                    onValueChange={(value: any) => setSettings({ ...settings, frequency: value })}
                    disabled={!settings.enabled}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="hourly" className="dark:text-slate-200">Every Hour</SelectItem>
                      <SelectItem value="daily" className="dark:text-slate-200">Daily</SelectItem>
                      <SelectItem value="weekly" className="dark:text-slate-200">Weekly</SelectItem>
                      <SelectItem value="monthly" className="dark:text-slate-200">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Default Storage Location</Label>
                  <Select 
                    value={settings.storageLocation} 
                    onValueChange={(value: any) => setSettings({ ...settings, storageLocation: value })}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="local" className="dark:text-slate-200">💾 Local Storage</SelectItem>
                      <SelectItem value="s3" className="dark:text-slate-200">☁️ Amazon S3</SelectItem>
                      <SelectItem value="google-drive" className="dark:text-slate-200">📁 Google Drive</SelectItem>
                      <SelectItem value="dropbox" className="dark:text-slate-200">📦 Dropbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Retention Period (days)</Label>
                  <Input 
                    type="number"
                    value={settings.retention}
                    onChange={(e) => setSettings({ ...settings, retention: parseInt(e.target.value) })}
                    min={1}
                    max={365}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Auto-delete backups older than this</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Auto-Verify Backups</Label>
                    <p className="text-sm text-muted-foreground dark:text-slate-400">Automatically verify integrity after backup</p>
                  </div>
                  <Switch
                    checked={settings.autoVerify}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoVerify: checked })}
                    className="dark:bg-slate-700"
                  />
                </div>

                {/* Cloud Credentials Configuration - Always visible */}
                <div className="border-t pt-4 space-y-4 dark:border-slate-600">
                  <h4 className="font-medium flex items-center gap-2 dark:text-white">
                    <Cloud className="w-4 h-4" />
                    Cloud Storage Credentials
                  </h4>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Configure credentials for cloud backup storage</p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">Cloud Provider</Label>
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
                        <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <SelectItem value="local" className="dark:text-slate-200">Local (No cloud)</SelectItem>
                          <SelectItem value="aws" className="dark:text-slate-200">Amazon S3</SelectItem>
                          <SelectItem value="gcp" className="dark:text-slate-200">Google Cloud Storage</SelectItem>
                          <SelectItem value="azure" className="dark:text-slate-200">Microsoft Azure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">Bucket/Container Name</Label>
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
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">Region</Label>
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
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowSettings(false)} className="w-full sm:w-auto dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Cancel</Button>
              <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full sm:w-auto">
                {savingSettings ? 'Saving...' : 'Save Settings'}
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
      </div>
    </Layout>
  );
}
