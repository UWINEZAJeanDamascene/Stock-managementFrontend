import { useState, useEffect } from 'react';
import { Layout } from '../layout/Layout';
import { accessApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, UserRole } from '@/lib/permissions';
import { 
  Shield, Lock, Globe, Smartphone, Plus, Trash2, CheckCircle
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/app/components/ui/dialog';
import { Switch } from '@/app/components/ui/switch';
import { Badge } from '@/app/components/ui/badge';

interface IPEntry {
  _id: string;
  ip: string;
  description?: string;
  enabled: boolean;
  company?: string;
}

export default function SecurityPage() {
  const { user } = useAuth();
  const [ipList, setIPList] = useState<IPEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIPModal, setShowIPModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [ipForm, setIPForm] = useState({ ip: '', description: '', enabled: true });
  const [twoFASecret, setTwoFASecret] = useState<{ qr: string; secret: string } | null>(null);
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);

  const canManage = hasPermission((user?.role || undefined) as UserRole | undefined, 'access:manage');

  useEffect(() => {
    loadIPList();
  }, []);

  const loadIPList = async () => {
    try {
      const res = await accessApi.getIPWhitelist() as { success: boolean; data: IPEntry[] };
      if (res.success) {
        setIPList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load IP list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIP = async () => {
    try {
      await accessApi.createIPWhitelist(ipForm);
      setShowIPModal(false);
      setIPForm({ ip: '', description: '', enabled: true });
      loadIPList();
    } catch (err) {
      console.error('Failed to save IP:', err);
      alert('Failed to save IP entry');
    }
  };

  const handleDeleteIP = async (id: string) => {
    if (!confirm('Delete this IP entry?')) return;
    try {
      await accessApi.deleteIPWhitelist(id);
      loadIPList();
    } catch (err) {
      console.error('Failed to delete IP:', err);
    }
  };

  const handleToggleIP = async (entry: IPEntry) => {
    try {
      await accessApi.updateIPWhitelist(entry._id, { enabled: !entry.enabled });
      loadIPList();
    } catch (err) {
      console.error('Failed to toggle IP:', err);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await accessApi.setup2FA() as { success: boolean; data: { qr: string; secret: string } };
      if (res.success) {
        setTwoFASecret(res.data);
        setShow2FAModal(true);
      }
    } catch (err) {
      console.error('Failed to setup 2FA:', err);
      alert('Failed to setup 2FA');
    }
  };

  const handleVerify2FA = async () => {
    if (!token) return;
    setVerifying(true);
    try {
      await accessApi.verify2FA(token);
      setShow2FAModal(false);
      setToken('');
      setTwoFASecret(null);
      alert('2FA enabled successfully! Please refresh the page.');
      window.location.reload();
    } catch (err) {
      console.error('Failed to verify 2FA:', err);
      alert('Invalid token. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Disable 2FA? You will no longer need authentication codes to log in.')) return;
    try {
      await accessApi.disable2FA();
      alert('2FA disabled. Please refresh the page.');
      window.location.reload();
    } catch (err) {
      console.error('Failed to disable 2FA:', err);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-7 w-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Security Settings</h1>
        </div>

        <div className="grid gap-6">
          {/* 2FA Section */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                  <Smartphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">Two-Factor Authentication</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Add an extra layer of security to your account
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(user as any)?.twoFAEnabled ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" /> Enabled
                    </Badge>
                    <Button variant="outline" size="sm" onClick={handleDisable2FA}>
                      Disable
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleSetup2FA} className="gap-2">
                    <Lock className="h-4 w-4" /> Enable 2FA
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* IP Whitelist Section */}
          {canManage && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">IP Whitelist</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Restrict access to specific IP addresses
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowIPModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Add IP
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-4 text-slate-500">Loading...</div>
              ) : ipList.length === 0 ? (
                <div className="text-center py-4 text-slate-500">
                  No IP addresses whitelisted. All IPs are allowed.
                </div>
              ) : (
                <div className="space-y-2">
                  {ipList.map(entry => (
                    <div key={entry._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <code className="text-sm font-mono text-slate-700 dark:text-slate-300">{entry.ip}</code>
                        {entry.description && (
                          <span className="text-sm text-slate-500">{entry.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={entry.enabled} 
                          onCheckedChange={() => handleToggleIP(entry)}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500"
                          onClick={() => handleDeleteIP(entry._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* IP Modal */}
        <Dialog open={showIPModal} onOpenChange={setShowIPModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add IP Address</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>IP Address</Label>
                <Input 
                  value={ipForm.ip}
                  onChange={e => setIPForm(prev => ({ ...prev, ip: e.target.value }))}
                  placeholder="e.g., 192.168.1.1"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input 
                  value={ipForm.description}
                  onChange={e => setIPForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Office network"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowIPModal(false)}>Cancel</Button>
              <Button onClick={handleSaveIP}>Add IP</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2FA Modal */}
        <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              {twoFASecret && (
                <div className="flex flex-col items-center">
                  <img src={twoFASecret.qr} alt="2FA QR Code" className="w-48 h-48" />
                  <p className="text-xs text-slate-500 mt-2">Manual code: {twoFASecret.secret}</p>
                </div>
              )}
              <div>
                <Label>Enter verification code</Label>
                <Input 
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="6-digit code from your app"
                  maxLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShow2FAModal(false)}>Cancel</Button>
              <Button onClick={handleVerify2FA} disabled={verifying || token.length !== 6}>
                {verifying ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
