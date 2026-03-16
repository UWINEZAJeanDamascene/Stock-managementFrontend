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
        <div className="p-6 text-foreground">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Backup & Restore</h1>
            <p className="text-muted-foreground">Manage your data backups and recovery options</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSettings(true)}>
              <Shield className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Database className="w-4 h-4 mr-2" />
                  Create Backup
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Backup</DialogTitle>
                  <DialogDescription>Create a new backup of your data</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Backup Name (optional)</Label>
                    <Input 
                      value={newBackupName}
                      onChange={(e) => setNewBackupName(e.target.value)}
                      placeholder="My Backup"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Storage Location</Label>
                    <Select value={newBackupLocation} onValueChange={setNewBackupLocation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local Storage</SelectItem>
                        <SelectItem value="cloud">Cloud Storage</SelectItem>
                        <SelectItem value="s3">Amazon S3</SelectItem>
                        <SelectItem value="google-drive">Google Drive</SelectItem>
                        <SelectItem value="dropbox">Dropbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="w-full sm:w-auto">Cancel</Button>
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
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Backups</CardDescription>
              <CardTitle className="text-3xl">{stats?.totalBackups || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {stats?.completedBackups || 0} completed, {stats?.failedBackups || 0} failed
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Size</CardDescription>
              <CardTitle className="text-3xl">{stats?.formattedTotalSize || '0 B'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Across all backups
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Verified</CardDescription>
              <CardTitle className="text-3xl text-green-500">{stats?.verifiedBackups || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Backups with integrity verified
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last Backup</CardDescription>
              <CardTitle className="text-xl">
                {stats?.lastBackup ? formatDate(stats.lastBackup) : 'Never'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {settings.enabled ? `Next: ${settings.frequency}` : 'Auto-backup disabled'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Storage Location Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Quick Backup
            </CardTitle>
            <CardDescription>Select storage location and create a backup instantly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 w-full sm:w-auto">
                <Label className="mb-2 block">Storage Location</Label>
                <Select value={newBackupLocation} onValueChange={setNewBackupLocation}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select storage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">💾 Local Storage</SelectItem>
                    <SelectItem value="s3">☁️ Amazon S3</SelectItem>
                    <SelectItem value="google-drive">📁 Google Drive</SelectItem>
                    <SelectItem value="dropbox">📦 Dropbox</SelectItem>
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
              <p className="text-sm text-yellow-600 mt-2">
                ⚠️ Configure cloud credentials in Settings before using cloud storage
              </p>
            )}
          </CardContent>
        </Card>

        {/* Point-in-Time Recovery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Point-in-Time Recovery
            </CardTitle>
            <CardDescription>Available recovery points for restoring data to a specific time</CardDescription>
          </CardHeader>
          <CardContent>
            {pointsInTime.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No backup points available</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pointsInTime.slice(0, 6).map((point) => (
                  <div key={point.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{point.name}</span>
                      <Badge variant="outline">{formatFileSize(point.fileSize)}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(point.timestamp)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {point.totalDocuments} documents
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Backup History
            </CardTitle>
            <CardDescription>View and manage your existing backups</CardDescription>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No backups found. Create your first backup!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup._id}>
                      <TableCell className="font-medium">{backup.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {backup.type === 'manual' && <HardDrive className="w-3 h-3 mr-1" />}
                          {backup.type === 'automated' && <RefreshCw className="w-3 h-3 mr-1" />}
                          {backup.type === 'scheduled' && <Clock className="w-3 h-3 mr-1" />}
                          {backup.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(backup.status)}</TableCell>
                      <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                      <TableCell>{formatDate(backup.createdAt)}</TableCell>
                      <TableCell>
                        {backup.verification?.verified ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : backup.verification?.integrityStatus === 'corrupted' ? (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Corrupted
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not verified</Badge>
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
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Download"
                                onClick={() => handleDownload(backup._id)}
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
                            className="text-red-500 hover:text-red-700"
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
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Backup Settings</DialogTitle>
              <DialogDescription>Configure automated backup schedule and cloud storage credentials</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-foreground">Enable Automated Backups</Label>
                    <p className="text-sm text-muted-foreground">Automatically backup your data on a schedule</p>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Backup Frequency</Label>
                  <Select 
                    value={settings.frequency} 
                    onValueChange={(value: any) => setSettings({ ...settings, frequency: value })}
                    disabled={!settings.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Every Hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Default Storage Location</Label>
                  <Select 
                    value={settings.storageLocation} 
                    onValueChange={(value: any) => setSettings({ ...settings, storageLocation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">💾 Local Storage</SelectItem>
                      <SelectItem value="s3">☁️ Amazon S3</SelectItem>
                      <SelectItem value="google-drive">📁 Google Drive</SelectItem>
                      <SelectItem value="dropbox">📦 Dropbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Retention Period (days)</Label>
                  <Input 
                    type="number"
                    value={settings.retention}
                    onChange={(e) => setSettings({ ...settings, retention: parseInt(e.target.value) })}
                    min={1}
                    max={365}
                  />
                  <p className="text-sm text-muted-foreground">Auto-delete backups older than this</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-foreground">Auto-Verify Backups</Label>
                    <p className="text-sm text-muted-foreground">Automatically verify integrity after backup</p>
                  </div>
                  <Switch
                    checked={settings.autoVerify}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoVerify: checked })}
                  />
                </div>

                {/* Cloud Credentials Configuration - Always visible */}
                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Cloud className="w-4 h-4" />
                    Cloud Storage Credentials
                  </h4>
                  <p className="text-sm text-muted-foreground">Configure credentials for cloud backup storage</p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Cloud Provider</Label>
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local (No cloud)</SelectItem>
                          <SelectItem value="aws">Amazon S3</SelectItem>
                          <SelectItem value="gcp">Google Cloud Storage</SelectItem>
                          <SelectItem value="azure">Microsoft Azure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Bucket/Container Name</Label>
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
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Region</Label>
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
                      />
                    </div>
                  </div>
                </div>
              </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowSettings(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full sm:w-auto">
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Confirmation Dialog */}
        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Confirm Restore
              </DialogTitle>
              <DialogDescription>
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
                <p className="text-sm text-muted-foreground mt-4">
                  This action cannot be undone. We recommend creating a backup of your current data before proceeding.
                </p>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowRestoreDialog(false)} className="w-full sm:w-auto">Cancel</Button>
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
