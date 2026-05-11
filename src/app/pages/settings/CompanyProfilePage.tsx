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
  Percent,
  FileText,
  RefreshCw,
  BadgeCheck,
  Briefcase,
  Landmark,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
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
        address: profile.address ? {
          street: profile.address.street || undefined,
          city: profile.address.city || undefined,
          state: profile.address.state || undefined,
          country: profile.address.country || undefined,
          postcode: profile.address.postcode || undefined,
        } : undefined,
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
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1000px] space-y-6">
            {/* Hero skeleton */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-8 w-48" />
              </div>
              <Skeleton className="mt-3 h-4 w-72" />
            </div>
            {/* Tab skeleton */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
              <Skeleton className="h-9 w-36 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-md" />
            </div>
            {/* Card skeletons */}
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="space-y-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-64" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1000px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_320px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Company Settings
                  </h1>
                  {profile && (
                    <Badge variant="secondary" className="h-6">
                      {profile.code}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                  Manage company profile and system settings
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchData}
                    disabled={saving}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              {profile && (
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Company</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate" title={profile.name}>
                      {profile.name}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Currency</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {profile.base_currency}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200 pb-1 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Company Profile
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="h-4 w-4" />
              System Settings
            </button>
          </div>

        {/* Company Profile Tab */}
        {activeTab === 'profile' && profile && (
          <div className="space-y-6">
            {/* Basic Info */}
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                    Basic Information
                  </CardTitle>
                </div>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                  Company name, legal name, and registration details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Name *</Label>
                    <Input
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Legal Name</Label>
                    <Input
                      value={profile.legal_name || ''}
                      onChange={(e) => setProfile({ ...profile, legal_name: e.target.value })}
                      placeholder="Full registered legal name"
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Registration Number</Label>
                    <Input
                      value={profile.registration_number || ''}
                      onChange={(e) => setProfile({ ...profile, registration_number: e.target.value })}
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tax Identification Number (TIN)</Label>
                    <Input
                      value={profile.tax_identification_number || ''}
                      onChange={(e) => setProfile({ ...profile, tax_identification_number: e.target.value })}
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Industry</Label>
                    <Input
                      value={profile.industry || ''}
                      onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Code</Label>
                    <Input value={profile.code} disabled className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Mail className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                    Contact Information
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
                    </Label>
                    <Input
                      type="email"
                      value={profile.email || ''}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> Phone
                    </Label>
                    <Input
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Globe className="h-3.5 w-3.5 text-slate-400" /> Website
                    </Label>
                    <Input
                      value={profile.website || ''}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-violet-50 p-1.5 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                    Address
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Street Address</Label>
                    <Input
                      value={profile.address?.street || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, address: { ...profile.address, street: e.target.value } })
                      }
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">City</Label>
                    <Input
                      value={profile.address?.city || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, address: { ...profile.address, city: e.target.value } })
                      }
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">State / Province</Label>
                    <Input
                      value={profile.address?.state || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, address: { ...profile.address, state: e.target.value } })
                      }
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Country</Label>
                    <Input
                      value={profile.address?.country || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, address: { ...profile.address, country: e.target.value } })
                      }
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Postcode</Label>
                    <Input
                      value={profile.address?.postcode || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, address: { ...profile.address, postcode: e.target.value } })
                      }
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Settings */}
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                    Financial Settings
                  </CardTitle>
                </div>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                  These settings affect how transactions are recorded and reported
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Base Currency</Label>
                    <Input
                      value={profile.base_currency}
                      disabled
                      className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cannot be changed once transactions exist</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fiscal Year Start</Label>
                    <Select
                      value={String(profile.fiscal_year_start_month)}
                      onValueChange={(v) =>
                        setProfile({ ...profile, fiscal_year_start_month: parseInt(v) })
                      }
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Default Payment Terms (Days)
                    </Label>
                    <Input
                      type="number"
                      value={profile.default_payment_terms_days}
                      onChange={(e) =>
                        setProfile({ ...profile, default_payment_terms_days: parseInt(e.target.value) || 30 })
                      }
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <Checkbox
                      id="vat-registered"
                      checked={profile.is_vat_registered}
                      onCheckedChange={(checked) =>
                        setProfile({ ...profile, is_vat_registered: Boolean(checked) })
                      }
                    />
                    <div>
                      <Label htmlFor="vat-registered" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        VAT Registered
                      </Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enable VAT calculations on invoices
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Percent className="h-3.5 w-3.5 text-slate-400" /> VAT Rate (%)
                    </Label>
                    <Input
                      type="number"
                      value={profile.vat_rate_pct}
                      onChange={(e) =>
                        setProfile({ ...profile, vat_rate_pct: parseFloat(e.target.value) || 0 })
                      }
                      disabled={!profile.is_vat_registered}
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800 disabled:opacity-60"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Company Profile
            </Button>
          </div>
        )}

        {/* System Settings Tab */}
        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            {/* Invoice Settings */}
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                    <FileText className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                    Invoice & Document Settings
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Invoice Prefix</Label>
                    <Input
                      value={settings.invoice_prefix}
                      onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Default Invoice Due Days
                    </Label>
                    <Input
                      type="number"
                      value={settings.default_invoice_due_days}
                      onChange={(e) =>
                        setSettings({ ...settings, default_invoice_due_days: parseInt(e.target.value) || 30 })
                      }
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Default Quote Expiry Days
                    </Label>
                    <Input
                      type="number"
                      value={settings.default_quote_expiry_days}
                      onChange={(e) =>
                        setSettings({ ...settings, default_quote_expiry_days: parseInt(e.target.value) || 30 })
                      }
                      className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Document Theme Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={settings.document_theme_color}
                        onChange={(e) =>
                          setSettings({ ...settings, document_theme_color: e.target.value })
                        }
                        className="w-14 h-10 p-1 rounded-md border border-slate-200 dark:border-slate-800"
                      />
                      <Input
                        value={settings.document_theme_color}
                        onChange={(e) =>
                          setSettings({ ...settings, document_theme_color: e.target.value })
                        }
                        className="font-mono bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Invoice Footer Text</Label>
                  <textarea
                    value={settings.invoice_footer_text}
                    onChange={(e) => setSettings({ ...settings, invoice_footer_text: e.target.value })}
                    className="w-full min-h-[80px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Instructions</Label>
                  <textarea
                    value={settings.invoice_payment_instructions}
                    onChange={(e) => setSettings({ ...settings, invoice_payment_instructions: e.target.value })}
                    className="w-full min-h-[80px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stock & Inventory */}
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                    Stock & Inventory
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Costing Method</Label>
                    <Select
                      value={settings.default_costing_method}
                      onValueChange={(v) =>
                        setSettings({ ...settings, default_costing_method: v as 'fifo' | 'wac' })
                      }
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fifo">FIFO (First In, First Out)</SelectItem>
                        <SelectItem value="wac">WAC (Weighted Average Cost)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <Checkbox
                      id="allow-negative-stock"
                      checked={settings.allow_negative_stock}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, allow_negative_stock: Boolean(checked) })
                      }
                    />
                    <div>
                      <Label htmlFor="allow-negative-stock" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Allow Negative Stock
                      </Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Allow stock levels to go below zero</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <Checkbox
                      id="low-stock-alerts"
                      checked={settings.low_stock_alert_enabled}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, low_stock_alert_enabled: Boolean(checked) })
                      }
                    />
                    <div>
                      <Label htmlFor="low-stock-alerts" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Low Stock Alerts
                      </Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Get notified when stock is low</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* VAT */}
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                    VAT & Tax
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                  <Checkbox
                    id="auto-apply-vat"
                    checked={settings.auto_apply_vat}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, auto_apply_vat: Boolean(checked) })
                    }
                  />
                  <div>
                    <Label htmlFor="auto-apply-vat" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Auto-Apply VAT
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Automatically add VAT to invoices</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save System Settings
            </Button>
          </div>
        )}
      </div>
      </div>
    </Layout>
  );
}
