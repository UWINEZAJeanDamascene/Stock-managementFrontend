import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { suppliersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  Save, 
  Loader2
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';

interface SupplierFormData {
  name: string;
  code: string;
  contact: {
    email?: string;
    phone?: string;
    fax?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    contactPerson?: string;
  };
  paymentTerms: string;
  taxId: string;
  region: string;
  currency: string;
  leadTime: number;
  minimumOrder: number;
  bankName: string;
  bankAccount: string;
  notes: string;
  isActive: boolean;
}

const initialFormData: SupplierFormData = {
  name: '',
  code: '',
  contact: {},
  paymentTerms: 'cash',
  taxId: '',
  region: '',
  currency: '',
  leadTime: 0,
  minimumOrder: 0,
  bankName: '',
  bankAccount: '',
  notes: '',
  isActive: true
};

export default function SupplierFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);

  useEffect(() => {
    if (isEditMode && id) {
      fetchSupplier(id);
    }
  }, [id, isEditMode]);

  const fetchSupplier = async (supplierId: string) => {
    setLoading(true);
    try {
      const response: any = await suppliersApi.getById(supplierId);
      if (response.success && response.data) {
        const s = response.data;
        setFormData({
          name: s.name || '',
          code: s.code || '',
          contact: s.contact || {},
          paymentTerms: s.paymentTerms || 'cash',
          taxId: s.taxId || '',
          region: s.region || '',
          currency: s.currency || '',
          leadTime: s.leadTime || 0,
          minimumOrder: s.minimumOrder || 0,
          bankName: s.bankName || '',
          bankAccount: s.bankAccount || '',
          notes: s.notes || '',
          isActive: s.isActive !== false
        });
      }
    } catch (error) {
      console.error('[SupplierFormPage] Failed to fetch supplier:', error);
      toast.error(t('suppliers.errors.notFound', 'Supplier not found'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('contact.')) {
      const contactField = field.replace('contact.', '');
      setFormData(prev => ({
        ...prev,
        contact: { ...prev.contact, [contactField]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(t('suppliers.errors.nameRequired', 'Supplier name is required'));
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: formData.name,
        contact: formData.contact,
        paymentTerms: formData.paymentTerms,
        isActive: formData.isActive,
      };
      if (formData.code) payload.code = formData.code;
      if (formData.taxId) payload.taxId = formData.taxId;
      if (formData.region) payload.region = formData.region;
      if (formData.currency) payload.currency = formData.currency;
      if (formData.leadTime > 0) payload.leadTime = formData.leadTime;
      if (formData.minimumOrder > 0) payload.minimumOrder = formData.minimumOrder;
      if (formData.bankName) payload.bankName = formData.bankName;
      if (formData.bankAccount) payload.bankAccount = formData.bankAccount;
      if (formData.notes) payload.notes = formData.notes;

      let response: any;
      if (isEditMode && id) {
        response = await suppliersApi.update(id, payload);
      } else {
        response = await suppliersApi.create(payload);
      }

      if (response.success) {
        toast.success(isEditMode 
          ? t('suppliers.success.updated', 'Supplier updated successfully')
          : t('suppliers.success.created', 'Supplier created successfully'));
        navigate('/suppliers');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || (isEditMode 
        ? t('suppliers.errors.updateFailed', 'Failed to update supplier')
        : t('suppliers.errors.createFailed', 'Failed to create supplier')));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/suppliers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEditMode ? t('suppliers.editSupplier', 'Edit Supplier') : t('suppliers.addSupplier', 'Add Supplier')}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Fields */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">{t('suppliers.basicInfo', 'Basic Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-slate-900 dark:text-white">{t('suppliers.name', 'Name')} *</Label>
                      <Input 
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="code" className="text-slate-900 dark:text-white">{t('suppliers.code', 'Code')}</Label>
                      <Input 
                        id="code"
                        value={formData.code}
                        onChange={(e) => handleChange('code', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                        placeholder={t('suppliers.autoGenerate', 'Auto-generate if empty')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentTerms" className="text-slate-900 dark:text-white">{t('suppliers.paymentTerms', 'Payment Terms')}</Label>
                      <Select 
                        value={formData.paymentTerms} 
                        onValueChange={(value) => handleChange('paymentTerms', value)}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <SelectItem value="cash" className="dark:text-slate-200">Cash</SelectItem>
                          <SelectItem value="credit_7" className="dark:text-slate-200">Credit 7 Days</SelectItem>
                          <SelectItem value="credit_15" className="dark:text-slate-200">Credit 15 Days</SelectItem>
                          <SelectItem value="credit_30" className="dark:text-slate-200">Credit 30 Days</SelectItem>
                          <SelectItem value="credit_45" className="dark:text-slate-200">Credit 45 Days</SelectItem>
                          <SelectItem value="credit_60" className="dark:text-slate-200">Credit 60 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="taxId" className="text-slate-900 dark:text-white">{t('suppliers.taxId', 'Tax ID')}</Label>
                      <Input 
                        id="taxId"
                        value={formData.taxId}
                        onChange={(e) => handleChange('taxId', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="region" className="text-slate-900 dark:text-white">{t('suppliers.region', 'Region')}</Label>
                      <Input 
                        id="region"
                        value={formData.region}
                        onChange={(e) => handleChange('region', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency" className="text-slate-900 dark:text-white">{t('suppliers.currency', 'Currency')}</Label>
                      <Input 
                        id="currency"
                        value={formData.currency}
                        onChange={(e) => handleChange('currency', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                        placeholder="USD"
                      />
                    </div>
                    <div>
                      <Label htmlFor="leadTime" className="text-slate-900 dark:text-white">{t('suppliers.leadTime', 'Lead Time (days)')}</Label>
                      <Input 
                        id="leadTime"
                        type="number"
                        min="0"
                        value={formData.leadTime}
                        onChange={(e) => handleChange('leadTime', parseInt(e.target.value) || 0)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">{t('suppliers.contactInfo', 'Contact Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactPerson" className="text-slate-900 dark:text-white">{t('suppliers.contactPerson', 'Contact Person')}</Label>
                      <Input 
                        id="contactPerson"
                        value={formData.contact.contactPerson || ''}
                        onChange={(e) => handleChange('contact.contactPerson', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-slate-900 dark:text-white">{t('suppliers.email', 'Email')}</Label>
                      <Input 
                        id="email"
                        type="email"
                        value={formData.contact.email || ''}
                        onChange={(e) => handleChange('contact.email', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone" className="text-slate-900 dark:text-white">{t('suppliers.phone', 'Phone')}</Label>
                      <Input 
                        id="phone"
                        value={formData.contact.phone || ''}
                        onChange={(e) => handleChange('contact.phone', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="website" className="text-slate-900 dark:text-white">{t('suppliers.website', 'Website')}</Label>
                      <Input 
                        id="website"
                        value={formData.contact.website || ''}
                        onChange={(e) => handleChange('contact.website', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-slate-900 dark:text-white">{t('suppliers.address', 'Address')}</Label>
                    <Textarea 
                      id="address"
                      value={formData.contact.address || ''}
                      onChange={(e) => handleChange('contact.address', e.target.value)}
                      rows={2}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-slate-900 dark:text-white">{t('suppliers.city', 'City')}</Label>
                      <Input 
                        id="city"
                        value={formData.contact.city || ''}
                        onChange={(e) => handleChange('contact.city', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-slate-900 dark:text-white">{t('suppliers.state', 'State/Region')}</Label>
                      <Input 
                        id="state"
                        value={formData.contact.state || ''}
                        onChange={(e) => handleChange('contact.state', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode" className="text-slate-900 dark:text-white">{t('suppliers.zipCode', 'Zip Code')}</Label>
                      <Input 
                        id="zipCode"
                        value={formData.contact.zipCode || ''}
                        onChange={(e) => handleChange('contact.zipCode', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country" className="text-slate-900 dark:text-white">{t('suppliers.country', 'Country')}</Label>
                      <Input 
                        id="country"
                        value={formData.contact.country || ''}
                        onChange={(e) => handleChange('contact.country', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">{t('suppliers.bankInfo', 'Banking Details')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="bankName" className="text-slate-900 dark:text-white">{t('suppliers.bankName', 'Bank Name')}</Label>
                    <Input 
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => handleChange('bankName', e.target.value)}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankAccount" className="text-slate-900 dark:text-white">{t('suppliers.bankAccount', 'Bank Account')}</Label>
                    <Input 
                      id="bankAccount"
                      value={formData.bankAccount}
                      onChange={(e) => handleChange('bankAccount', e.target.value)}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">{t('suppliers.additionalInfo', 'Additional Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="minimumOrder" className="text-slate-900 dark:text-white">{t('suppliers.minimumOrder', 'Minimum Order Value')}</Label>
                    <Input 
                      id="minimumOrder"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minimumOrder}
                      onChange={(e) => handleChange('minimumOrder', parseFloat(e.target.value) || 0)}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-slate-900 dark:text-white">{t('suppliers.notes', 'Notes')}</Label>
                    <Textarea 
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      rows={4}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2">
                <Button type="submit" disabled={saving} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t('common.save', 'Save')}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
