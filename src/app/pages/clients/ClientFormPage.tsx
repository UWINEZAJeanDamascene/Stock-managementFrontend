import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { clientsApi } from '@/lib/api';
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
import { useTranslation } from 'react-i18next';

interface ClientFormData {
  name: string;
  code?: string;
  type: 'individual' | 'company';
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    contactPerson?: string;
  };
  paymentTerms: string;
  creditLimit: number;
  notes?: string;
  isActive: boolean;
}

const initialFormData: ClientFormData = {
  name: '',
  type: 'individual',
  contact: {},
  paymentTerms: 'cash',
  creditLimit: 0,
  isActive: true
};

export default function ClientFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);

  useEffect(() => {
    if (isEditMode && id) {
      fetchClient(id);
    }
  }, [id, isEditMode]);

  const fetchClient = async (clientId: string) => {
    setLoading(true);
    try {
      console.log('[ClientFormPage] Fetching client:', clientId);
      const response = await clientsApi.getById(clientId);
      
      if (response.success && response.data) {
        const client = response.data as ClientFormData & { _id: string };
        setFormData({
          name: client.name || '',
          code: client.code,
          type: client.type || 'individual',
          contact: client.contact || {},
          paymentTerms: (client as any).paymentTerms || 'cash',
          creditLimit: client.creditLimit || 0,
          notes: (client as any).notes,
          isActive: client.isActive !== false
        });
      }
    } catch (error) {
      console.error('[ClientFormPage] Failed to fetch client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('contact.')) {
      const contactField = field.replace('contact.', '');
      setFormData(prev => ({
        ...prev,
        contact: {
          ...prev.contact,
          [contactField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    setSaving(true);
    try {
      console.log('[ClientFormPage] Saving client:', formData);
      
      const clientData = {
        name: formData.name,
        code: formData.code,
        type: formData.type,
        contact: formData.contact,
        paymentTerms: formData.paymentTerms,
        creditLimit: formData.creditLimit,
        notes: formData.notes,
        isActive: formData.isActive
      };

      let response;
      if (isEditMode && id) {
        response = await clientsApi.update(id, clientData);
      } else {
        response = await clientsApi.create(clientData);
      }

      console.log('[ClientFormPage] Save response:', response);
      
      if (response.success) {
        navigate('/clients');
      }
    } catch (error) {
      console.error('[ClientFormPage] Failed to save client:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/clients')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEditMode ? t('clients.editClient', 'Edit Client') : t('clients.addClient', 'Add Client')}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Fields */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">{t('clients.basicInfo', 'Basic Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-slate-900 dark:text-white">{t('clients.name', 'Name')} *</Label>
                      <Input 
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="code" className="text-slate-900 dark:text-white">{t('clients.code', 'Code')}</Label>
                      <Input 
                        id="code"
                        value={formData.code || ''}
                        onChange={(e) => handleChange('code', e.target.value)}
                        placeholder={t('clients.autoGenerate', 'Auto-generate if empty')}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type" className="text-slate-900 dark:text-white">{t('clients.type', 'Type')}</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value: 'individual' | 'company') => handleChange('type', value)}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <SelectItem value="individual" className="dark:text-slate-200">{t('clients.individual', 'Individual')}</SelectItem>
                          <SelectItem value="company" className="dark:text-slate-200">{t('clients.company', 'Company')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="paymentTerms" className="text-slate-900 dark:text-white">{t('clients.paymentTerms', 'Payment Terms')}</Label>
                      <Select 
                        value={formData.paymentTerms} 
                        onValueChange={(value) => handleChange('paymentTerms', value)}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <SelectItem value="cash" className="dark:text-slate-200">{t('clients.paymentTermsCash', 'Cash')}</SelectItem>
                          <SelectItem value="credit_7" className="dark:text-slate-200">{t('clients.paymentTermsCredit7', 'Credit 7 Days')}</SelectItem>
                          <SelectItem value="credit_15" className="dark:text-slate-200">{t('clients.paymentTermsCredit15', 'Credit 15 Days')}</SelectItem>
                          <SelectItem value="credit_30" className="dark:text-slate-200">{t('clients.paymentTermsCredit30', 'Credit 30 Days')}</SelectItem>
                          <SelectItem value="credit_45" className="dark:text-slate-200">{t('clients.paymentTermsCredit45', 'Credit 45 Days')}</SelectItem>
                          <SelectItem value="credit_60" className="dark:text-slate-200">{t('clients.paymentTermsCredit60', 'Credit 60 Days')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">{t('clients.contactInfo', 'Contact Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email" className="text-slate-900 dark:text-white">{t('clients.email', 'Email')}</Label>
                      <Input 
                        id="email"
                        type="email"
                        value={formData.contact.email || ''}
                        onChange={(e) => handleChange('contact.email', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-slate-900 dark:text-white">{t('clients.phone', 'Phone')}</Label>
                      <Input 
                        id="phone"
                        value={formData.contact.phone || ''}
                        onChange={(e) => handleChange('contact.phone', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-slate-900 dark:text-white">{t('clients.address', 'Address')}</Label>
                    <Textarea 
                      id="address"
                      value={formData.contact.address || ''}
                      onChange={(e) => handleChange('contact.address', e.target.value)}
                      rows={2}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-slate-900 dark:text-white">{t('clients.city', 'City')}</Label>
                      <Input 
                        id="city"
                        value={formData.contact.city || ''}
                        onChange={(e) => handleChange('contact.city', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-slate-900 dark:text-white">{t('clients.state', 'State/Region')}</Label>
                      <Input 
                        id="state"
                        value={formData.contact.state || ''}
                        onChange={(e) => handleChange('contact.state', e.target.value)}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country" className="text-slate-900 dark:text-white">{t('clients.country', 'Country')}</Label>
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
                  <CardTitle className="text-slate-900 dark:text-white">{t('clients.additionalInfo', 'Additional Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="creditLimit" className="text-slate-900 dark:text-white">{t('clients.creditLimit', 'Credit Limit')}</Label>
                    <Input 
                      id="creditLimit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.creditLimit}
                      onChange={(e) => handleChange('creditLimit', parseFloat(e.target.value) || 0)}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-slate-900 dark:text-white">{t('clients.notes', 'Notes')}</Label>
                    <Textarea 
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      rows={4}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2">
                <Button type="submit" disabled={saving}>
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