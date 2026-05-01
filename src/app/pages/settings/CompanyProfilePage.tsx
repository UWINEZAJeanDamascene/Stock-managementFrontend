import { useState, useEffect } from 'react';
import { companyApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Loader2,
  Building2,
  Save,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  CreditCard,
  Percent,
  FileText
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';

interface CompanyProfile {
  _id: string;
  name: string;
  legal_name: string | null;
  code: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: {
    street: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postcode: string | null;
  };
  base_currency: string;
  fiscal_year_start_month: number;
  registration_number: string | null;
  tax_identification_number: string | null;
  is_vat_registered: boolean;
  vat_rate_pct: number;
  default_payment_terms_days: number;
  industry: string | null;
  logo_url: string | null;
}

interface SystemSettings {
  invoice_prefix: string;
  invoice_footer_text: string;
  invoice_payment_instructions: string;
  default_invoice_due_days: number;
  default_quote_expiry_days: number;
  auto_apply_vat: boolean;
  default_costing_method: 'fifo' | 'wac';
  allow_negative_stock: boolean;
  low_stock_alert_enabled: boolean;
  document_theme_color: string;
}

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export default function CompanyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [companyId, setCompanyId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await companyApi.getMe() as any;
      if (response.data) {
        setProfile(response.data);
        setCompanyId(response.data._id);
      }
      if (response.settings) {
        setSettings(response.settings);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await companyApi.update({
        name: profile.name,
        legal_name: profile.legal_name || undefined,
        email: profile.email || undefined,
        phone: profile.phone || undefined,
        website: profile.website || undefined,
        registration_number: profile.registration_number || undefined,
        tax_identification_number: profile.tax_identification_number || undefined,
        industry: profile.industry || undefined,
        fiscal_year_start_month: profile.fiscal_year_start_month,
        default_payment_terms_days: profile.default_payment_terms_days,
        is_vat_registered: profile.is_vat_registered,
        vat_rate_pct: profile.vat_rate_pct,
        address: profile.address || undefined,
      });
      toast.success('Company profile updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://stock-tenancy-system.onrender.com/api'}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('System settings updated');
      } else {
        toast.error(data.message || 'Failed to update settings');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto bg-gray-50 dark:bg-slate-900 min-h-screen p-3 md:p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 dark:text-white">
            <Building2 className="h-8 w-8" />
            Company Settings
          </h1>
          <p className="text-muted-foreground dark:text-slate-400 mt-1">Manage company profile and system settings</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b dark:border-slate-600">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-primary text-foreground dark:text-white'
                : 'border-transparent text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-white'
            }`}
          >
            <Building2 className="h-4 w-4 inline mr-2" />
            Company Profile
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-primary text-foreground dark:text-white'
                : 'border-transparent text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            System Settings
          </button>
        </div>

        {/* Company Profile Tab */}
        {activeTab === 'profile' && profile && (
          <div className="space-y-6">
            {/* Basic Info */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Basic Information</CardTitle>
                <CardDescription className="dark:text-slate-400">Company name, legal name, and registration details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Company Name *</Label>
                    <Input
                      value={profile.name}
                      onChange={e => setProfile({ ...profile, name: e.target.value })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Legal Name</Label>
                    <Input
                      value={profile.legal_name || ''}
                      onChange={e => setProfile({ ...profile, legal_name: e.target.value })}
                      placeholder="Full registered legal name"
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Registration Number</Label>
                    <Input
                      value={profile.registration_number || ''}
                      onChange={e => setProfile({ ...profile, registration_number: e.target.value })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Tax Identification Number (TIN)</Label>
                    <Input
                      value={profile.tax_identification_number || ''}
                      onChange={e => setProfile({ ...profile, tax_identification_number: e.target.value })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Industry</Label>
                    <Input
                      value={profile.industry || ''}
                      onChange={e => setProfile({ ...profile, industry: e.target.value })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Company Code</Label>
                    <Input value={profile.code} disabled className="bg-muted dark:bg-slate-600 dark:text-slate-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 dark:text-slate-200"><Mail className="h-3 w-3" /> Email</Label>
                    <Input
                      type="email"
                      value={profile.email || ''}
                      onChange={e => setProfile({ ...profile, email: e.target.value })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 dark:text-slate-200"><Phone className="h-3 w-3" /> Phone</Label>
                    <Input
                      value={profile.phone || ''}
                      onChange={e => setProfile({ ...profile, phone: e.target.value })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center gap-1 dark:text-slate-200"><Globe className="h-3 w-3" /> Website</Label>
                    <Input
                      value={profile.website || ''}
                      onChange={e => setProfile({ ...profile, website: e.target.value })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white"><MapPin className="h-5 w-5" /> Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="dark:text-slate-200">Street Address</Label>
                    <Input
                      value={profile.address?.street || ''}
                      onChange={e => setProfile({ ...profile, address: { ...profile.address, street: e.target.value } })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">City</Label>
                    <Input
                      value={profile.address?.city || ''}
                      onChange={e => setProfile({ ...profile, address: { ...profile.address, city: e.target.value } })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">State / Province</Label>
                    <Input
                      value={profile.address?.state || ''}
                      onChange={e => setProfile({ ...profile, address: { ...profile.address, state: e.target.value } })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Country</Label>
                    <Input
                      value={profile.address?.country || ''}
                      onChange={e => setProfile({ ...profile, address: { ...profile.address, country: e.target.value } })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Postcode</Label>
                    <Input
                      value={profile.address?.postcode || ''}
                      onChange={e => setProfile({ ...profile, address: { ...profile.address, postcode: e.target.value } })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Settings */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white"><CreditCard className="h-5 w-5" /> Financial Settings</CardTitle>
                <CardDescription className="dark:text-slate-400">These settings affect how transactions are recorded and reported</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Base Currency</Label>
                    <Input value={profile.base_currency} disabled className="bg-muted dark:bg-slate-600 dark:text-slate-300" />
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Cannot be changed once transactions exist</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Fiscal Year Start</Label>
                    <select
                      value={profile.fiscal_year_start_month}
                      onChange={e => setProfile({ ...profile, fiscal_year_start_month: parseInt(e.target.value) })}
                      className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-slate-700 dark:text-white dark:border-slate-600 px-3 py-2 text-sm"
                    >
                      {MONTHS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Default Payment Terms (Days)</Label>
                    <Input
                      type="number"
                      value={profile.default_payment_terms_days}
                      onChange={e => setProfile({ ...profile, default_payment_terms_days: parseInt(e.target.value) || 30 })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 dark:bg-slate-700/50">
                    <input
                      type="checkbox"
                      checked={profile.is_vat_registered}
                      onChange={e => setProfile({ ...profile, is_vat_registered: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <div>
                      <Label className="dark:text-slate-200">VAT Registered</Label>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">Enable VAT calculations on invoices</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 dark:text-slate-200"><Percent className="h-3 w-3" /> VAT Rate (%)</Label>
                    <Input
                      type="number"
                      value={profile.vat_rate_pct}
                      onChange={e => setProfile({ ...profile, vat_rate_pct: parseFloat(e.target.value) || 0 })}
                      disabled={!profile.is_vat_registered}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full dark:bg-primary dark:text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Company Profile
            </Button>
          </div>
        )}

        {/* System Settings Tab */}
        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            {/* Invoice Settings */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Invoice & Document Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Invoice Prefix</Label>
                    <Input
                      value={settings.invoice_prefix}
                      onChange={e => setSettings({ ...settings, invoice_prefix: e.target.value })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Default Invoice Due Days</Label>
                    <Input
                      type="number"
                      value={settings.default_invoice_due_days}
                      onChange={e => setSettings({ ...settings, default_invoice_due_days: parseInt(e.target.value) || 30 })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Default Quote Expiry Days</Label>
                    <Input
                      type="number"
                      value={settings.default_quote_expiry_days}
                      onChange={e => setSettings({ ...settings, default_quote_expiry_days: parseInt(e.target.value) || 30 })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Document Theme Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={settings.document_theme_color}
                        onChange={e => setSettings({ ...settings, document_theme_color: e.target.value })}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={settings.document_theme_color}
                        onChange={e => setSettings({ ...settings, document_theme_color: e.target.value })}
                        className="font-mono bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Invoice Footer Text</Label>
                  <textarea
                    value={settings.invoice_footer_text}
                    onChange={e => setSettings({ ...settings, invoice_footer_text: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background dark:bg-slate-700 dark:text-white dark:border-slate-600 px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Payment Instructions</Label>
                  <textarea
                    value={settings.invoice_payment_instructions}
                    onChange={e => setSettings({ ...settings, invoice_payment_instructions: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background dark:bg-slate-700 dark:text-white dark:border-slate-600 px-3 py-2 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stock & Inventory */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Stock & Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Default Costing Method</Label>
                    <select
                      value={settings.default_costing_method}
                      onChange={e => setSettings({ ...settings, default_costing_method: e.target.value as 'fifo' | 'wac' })}
                      className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-slate-700 dark:text-white dark:border-slate-600 px-3 py-2 text-sm"
                    >
                      <option value="fifo">FIFO (First In, First Out)</option>
                      <option value="wac">WAC (Weighted Average Cost)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 dark:bg-slate-700/50">
                    <input
                      type="checkbox"
                      checked={settings.allow_negative_stock}
                      onChange={e => setSettings({ ...settings, allow_negative_stock: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <div>
                      <Label className="dark:text-slate-200">Allow Negative Stock</Label>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">Allow stock levels to go below zero</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 dark:bg-slate-700/50">
                    <input
                      type="checkbox"
                      checked={settings.low_stock_alert_enabled}
                      onChange={e => setSettings({ ...settings, low_stock_alert_enabled: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <div>
                      <Label className="dark:text-slate-200">Low Stock Alerts</Label>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">Get notified when stock is low</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* VAT */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">VAT & Tax</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 dark:bg-slate-700/50">
                  <input
                    type="checkbox"
                    checked={settings.auto_apply_vat}
                    onChange={e => setSettings({ ...settings, auto_apply_vat: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <div>
                    <Label className="dark:text-slate-200">Auto-Apply VAT</Label>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Automatically add VAT to invoices</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSaveSettings} disabled={saving} className="w-full dark:bg-primary dark:text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save System Settings
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
