import { useState, useEffect } from 'react';
import { Layout } from '../layout/Layout';
import { notificationsApi } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';

interface NotificationSettings {
  emailNotifications: {
    enabled: boolean;
    invoiceDelivery: boolean;
    paymentReminders: boolean;
    lowStockAlerts: boolean;
    dailySummary: boolean;
    weeklySummary: boolean;
  };
  smsNotifications: {
    enabled: boolean;
    criticalOnly: boolean;
    adminPhones: string[];
  };
  preferences: {
    lowStockThreshold: number;
    paymentReminderDays: number;
    summarySendTime: string;
    largeOrderThreshold: number;
  };
  criticalAlertPhones: string[];
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: {
      enabled: true,
      invoiceDelivery: false,
      paymentReminders: true,
      lowStockAlerts: true,
      dailySummary: false,
      weeklySummary: true,
    },
    smsNotifications: {
      enabled: false,
      criticalOnly: true,
      adminPhones: [],
    },
    preferences: {
      lowStockThreshold: 10,
      paymentReminderDays: 3,
      summarySendTime: '09:00',
      largeOrderThreshold: 10000,
    },
    criticalAlertPhones: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await notificationsApi.getSettings();
      if (response.success && response.data) {
        setSettings(response.data as NotificationSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await notificationsApi.updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    const email = prompt('Enter email address to test:');
    if (!email) return;
    
    try {
      await notificationsApi.testEmail(email);
      toast.success('Test email sent!');
    } catch (error) {
      toast.error('Failed to send test email');
    }
  };

  const handleTestSMS = async () => {
    const phone = prompt('Enter phone number to test (with country code):');
    if (!phone) return;
    
    try {
      await notificationsApi.testSMS(phone);
      toast.success('Test SMS sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send test SMS');
    }
  };

  const handleSendSummary = async (type: 'daily' | 'weekly') => {
    try {
      await notificationsApi.sendManualSummary(type);
      toast.success(`${type === 'daily' ? 'Daily' : 'Weekly'} summary sent!`);
    } catch (error) {
      toast.error('Failed to send summary');
    }
  };

  const addPhone = () => {
    if (!newPhone.trim()) return;
    setSettings({
      ...settings,
      smsNotifications: {
        ...settings.smsNotifications,
        adminPhones: [...settings.smsNotifications.adminPhones, newPhone.trim()],
      },
    });
    setNewPhone('');
  };

  const removePhone = (index: number) => {
    setSettings({
      ...settings,
      smsNotifications: {
        ...settings.smsNotifications,
        adminPhones: settings.smsNotifications.adminPhones.filter((_, i) => i !== index),
      },
    });
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
      <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
          <p className="text-muted-foreground">Configure email and SMS notifications for your account</p>
        </div>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Email Notifications</CardTitle>
            <CardDescription className="text-muted-foreground">Configure which email notifications to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailEnabled" className="text-foreground">Enable Email Notifications</Label>
              <Switch
                id="emailEnabled"
                checked={settings.emailNotifications.enabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    emailNotifications: { ...settings.emailNotifications, enabled: checked },
                  })
                }
              />
            </div>

            <div className="space-y-3 ml-4 md:ml-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="invoiceDelivery" className="text-foreground">Automated Invoice Delivery</Label>
                <Switch
                  id="invoiceDelivery"
                  checked={settings.emailNotifications.invoiceDelivery}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      emailNotifications: { ...settings.emailNotifications, invoiceDelivery: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="paymentReminders" className="text-foreground">Payment Reminders</Label>
                <Switch
                  id="paymentReminders"
                  checked={settings.emailNotifications.paymentReminders}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      emailNotifications: { ...settings.emailNotifications, paymentReminders: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="lowStockAlerts" className="text-foreground">Low Stock Alerts</Label>
                <Switch
                  id="lowStockAlerts"
                  checked={settings.emailNotifications.lowStockAlerts}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      emailNotifications: { ...settings.emailNotifications, lowStockAlerts: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="dailySummary" className="text-foreground">Daily Summary Report</Label>
                <Switch
                  id="dailySummary"
                  checked={settings.emailNotifications.dailySummary}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      emailNotifications: { ...settings.emailNotifications, dailySummary: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="weeklySummary" className="text-foreground">Weekly Summary Report</Label>
                <Switch
                  id="weeklySummary"
                  checked={settings.emailNotifications.weeklySummary}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      emailNotifications: { ...settings.emailNotifications, weeklySummary: checked },
                    })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button variant="outline" onClick={handleTestEmail} className="w-full sm:w-auto">
                Test Email
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSendSummary('daily')}
                disabled={!settings.emailNotifications.dailySummary}
                className="w-full sm:w-auto"
              >
                Send Daily Summary Now
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSendSummary('weekly')}
                disabled={!settings.emailNotifications.weeklySummary}
                className="w-full sm:w-auto"
              >
                Send Weekly Summary Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SMS Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">SMS Notifications</CardTitle>
            <CardDescription className="text-muted-foreground">Configure SMS alerts for critical events (requires Twilio setup)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="smsEnabled" className="text-foreground">Enable SMS Notifications</Label>
              <Switch
                id="smsEnabled"
                checked={settings.smsNotifications.enabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    smsNotifications: { ...settings.smsNotifications, enabled: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="criticalOnly" className="text-foreground">Critical Events Only</Label>
              <Switch
                id="criticalOnly"
                checked={settings.smsNotifications.criticalOnly}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    smsNotifications: { ...settings.smsNotifications, criticalOnly: checked },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Admin Phone Numbers</Label>
              <div className="flex gap-2 flex-col sm:flex-row">
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full"
                />
                <Button type="button" onClick={addPhone} className="w-full sm:w-auto">
                  Add
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {settings.smsNotifications.adminPhones.map((phone, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded">
                    <span className="text-foreground break-all">{phone}</span>
                    <Button variant="ghost" size="sm" onClick={() => removePhone(index)} className="flex-shrink-0">
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleTestSMS} className="w-full sm:w-auto">
                Test SMS
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Notification Preferences</CardTitle>
            <CardDescription className="text-muted-foreground">Fine-tune your notification settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold" className="text-foreground">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  value={settings.preferences.lowStockThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, lowStockThreshold: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentReminderDays" className="text-foreground">Payment Reminder Days Before Due</Label>
                <Input
                  id="paymentReminderDays"
                  type="number"
                  value={settings.preferences.paymentReminderDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, paymentReminderDays: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summarySendTime" className="text-foreground">Summary Send Time</Label>
                <Input
                  id="summarySendTime"
                  type="time"
                  value={settings.preferences.summarySendTime}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, summarySendTime: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="largeOrderThreshold" className="text-foreground">Large Order Alert Threshold</Label>
                <Input
                  id="largeOrderThreshold"
                  type="number"
                  value={settings.preferences.largeOrderThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, largeOrderThreshold: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
