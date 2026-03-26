import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { fixedAssetsApi, assetCategoriesApi, suppliersApi, FixedAsset, AssetCategory } from '@/lib/api';
import { Supplier } from '@/services/supplierService';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Save,
  Loader2,
  Package,
  Calculator,
  Building2,
  Calendar,
  DollarSign,
  Percent,
  Clock,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function AssetCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showJournalEntry, setShowJournalEntry] = useState(false);
  const [journalEntry, setJournalEntry] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: 0,
    salvageValue: 0,
    usefulLifeMonths: 60,
    depreciationMethod: 'straight_line',
    decliningRate: 20,
    assetAccountCode: '1500',
    accumDepreciationAccountCode: '1510',
    depreciationExpenseAccountCode: '6000',
    supplierId: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
    if (isEdit && id) {
      fetchAsset(id);
    }
  }, [id, isEdit]);

  const fetchCategories = async () => {
    try {
      const response: any = await assetCategoriesApi.getAll();
      if (response.success) {
        setCategories(response.data || []);
        if (response.data && response.data.length > 0 && !isEdit) {
          const defaultCat: any = response.data[0];
          setFormData((prev: any) => ({
            ...prev,
            categoryId: defaultCat._id,
            usefulLifeMonths: defaultCat.defaultUsefulLifeMonths || 60,
            depreciationMethod: defaultCat.defaultDepreciationMethod || 'straight-line',
            assetAccountCode: defaultCat.defaultAssetAccountCode || '1500',
            accumDepreciationAccountCode: defaultCat.defaultAccumDepreciationAccountCode || '1510',
            depreciationExpenseAccountCode: defaultCat.defaultDepreciationExpenseAccountCode || '6000',
          }));
        }
      }
    } catch (error) {
      console.error('[AssetCreatePage] Failed to fetch categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response: any = await suppliersApi.getAll({ isActive: true });
      if (response.success) {
        setSuppliers(response.data || []);
      }
    } catch (error) {
      console.error('[AssetCreatePage] Failed to fetch suppliers:', error);
    }
  };

  const fetchAsset = async (assetId: string) => {
    setInitialLoading(true);
    try {
      const response: any = await fixedAssetsApi.getById(assetId);
      if (response.success && response.data) {
        const asset: any = response.data;
        setFormData({
          name: asset.name || '',
          description: asset.description || '',
          categoryId: asset.categoryId || '',
          purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
          purchaseCost: asset.purchaseCost || 0,
          salvageValue: asset.salvageValue || 0,
          usefulLifeMonths: asset.usefulLifeMonths || 60,
          depreciationMethod: asset.depreciationMethod || 'straight_line',
          decliningRate: asset.decliningRate || 20,
          assetAccountCode: asset.assetAccountCode || '1500',
          accumDepreciationAccountCode: asset.accumDepreciationAccountCode || '1510',
          depreciationExpenseAccountCode: asset.depreciationExpenseAccountCode || '6000',
          supplierId: asset.supplierId || '',
        });
      }
    } catch (error) {
      console.error('[AssetCreatePage] Failed to fetch asset:', error);
      toast.error(t('assets.errors.fetchFailed'));
      navigate('/assets');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((c) => c._id === categoryId);
    if (category) {
      setFormData((prev) => ({
        ...prev,
        categoryId,
        usefulLifeMonths: category.defaultUsefulLifeMonths || prev.usefulLifeMonths,
        depreciationMethod: category.defaultDepreciationMethod || prev.depreciationMethod,
        assetAccountCode: category.defaultAssetAccountCode || prev.assetAccountCode,
        accumDepreciationAccountCode: category.defaultAccumDepreciationAccountCode || prev.accumDepreciationAccountCode,
        depreciationExpenseAccountCode: category.defaultDepreciationExpenseAccountCode || prev.depreciationExpenseAccountCode,
      }));
    } else {
      setFormData((prev) => ({ ...prev, categoryId }));
    }
  };

  const calculateDepreciation = () => {
    const depreciableAmount = formData.purchaseCost - formData.salvageValue;
    if (formData.depreciationMethod === 'straight_line') {
      return depreciableAmount / formData.usefulLifeMonths;
    } else {
      const rate = formData.decliningRate / 100;
      return formData.purchaseCost * rate / 12;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data: Partial<FixedAsset> = {
        name: formData.name,
        description: formData.description,
        categoryId: formData.categoryId || undefined,
        purchaseDate: formData.purchaseDate,
        purchaseCost: formData.purchaseCost,
        salvageValue: formData.salvageValue,
        usefulLifeMonths: formData.usefulLifeMonths,
        depreciationMethod: formData.depreciationMethod as 'straight_line' | 'declining_balance',
        decliningRate: formData.depreciationMethod === 'declining_balance' ? formData.decliningRate : undefined,
        assetAccountCode: formData.assetAccountCode,
        accumDepreciationAccountCode: formData.accumDepreciationAccountCode,
        depreciationExpenseAccountCode: formData.depreciationExpenseAccountCode,
        supplierId: formData.supplierId || undefined,
      };

      let response;
      if (isEdit && id) {
        response = await fixedAssetsApi.update(id, data);
      } else {
        response = await fixedAssetsApi.create(data);
      }

      if (response.success) {
        toast.success(isEdit ? t('assets.success.update') : t('assets.success.create'));
        
        // Show journal entry if created new
        if (!isEdit && (response as any).journalEntry) {
          setJournalEntry((response as any).journalEntry);
          setShowJournalEntry(true);
        } else {
          navigate('/assets');
        }
      } else {
        toast.error((response as any).error || t('assets.errors.saveFailed'));
      }
    } catch (error: any) {
      console.error('[AssetCreatePage] Save error:', error);
      toast.error(error.response?.data?.error || t('assets.errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (initialLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const monthlyDepreciation = calculateDepreciation();
  const annualDepreciation = monthlyDepreciation * 12;
  const depreciableAmount = formData.purchaseCost - formData.salvageValue;

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/assets')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {isEdit ? t('assets.editTitle') : t('assets.createTitle')}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? t('assets.editDescription') : t('assets.createDescription')}
            </p>
          </div>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {t('common.save')}
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t('assets.sections.basicInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('assets.fields.name')} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder={t('assets.placeholders.name')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">{t('assets.fields.category')}</Label>
                      <Select value={formData.categoryId} onValueChange={handleCategoryChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('assets.placeholders.category')} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter((c: any) => c._id).map((cat: any) => (
                            <SelectItem key={cat._id} value={cat._id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t('assets.fields.description')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('assets.placeholders.description')}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">{t('assets.fields.supplier')}</Label>
                    <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('assets.placeholders.supplier')} />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.filter((s: any) => s._id).map((sup: any) => (
                          <SelectItem key={sup._id} value={sup._id}>
                            {sup.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Purchase Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {t('assets.sections.purchaseDetails')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchaseDate">{t('assets.fields.purchaseDate')} *</Label>
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchaseCost">{t('assets.fields.purchaseCost')} *</Label>
                      <Input
                        id="purchaseCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.purchaseCost}
                        onChange={(e) => setFormData({ ...formData, purchaseCost: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salvageValue">{t('assets.fields.salvageValue')}</Label>
                      <Input
                        id="salvageValue"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.salvageValue}
                        onChange={(e) => setFormData({ ...formData, salvageValue: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('assets.fields.depreciableAmount')}</Label>
                      <div className="p-2 bg-muted rounded-md">
                        <span className="text-lg font-semibold">{formatCurrency(depreciableAmount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Depreciation Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    {t('assets.sections.depreciation')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="usefulLifeMonths">{t('assets.fields.usefulLifeMonths')} *</Label>
                      <Input
                        id="usefulLifeMonths"
                        type="number"
                        min="1"
                        value={formData.usefulLifeMonths}
                        onChange={(e) => setFormData({ ...formData, usefulLifeMonths: parseInt(e.target.value) || 60 })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depreciationMethod">{t('assets.fields.depreciationMethod')} *</Label>
                      <Select
                        value={formData.depreciationMethod}
                        onValueChange={(v) => setFormData({ ...formData, depreciationMethod: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="straight_line">{t('assets.depreciation.straightLine')}</SelectItem>
                          <SelectItem value="declining_balance">{t('assets.depreciation.decliningBalance')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.depreciationMethod === 'declining_balance' && (
                      <div className="space-y-2">
                        <Label htmlFor="decliningRate">{t('assets.fields.decliningRate')} (%)</Label>
                        <Input
                          id="decliningRate"
                          type="number"
                          min="1"
                          max="100"
                          value={formData.decliningRate}
                          onChange={(e) => setFormData({ ...formData, decliningRate: parseInt(e.target.value) || 20 })}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Account Codes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {t('assets.sections.accounts')}
                  </CardTitle>
                  <CardDescription>{t('assets.sections.accountsDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assetAccountCode">{t('assets.fields.assetAccount')}</Label>
                      <Input
                        id="assetAccountCode"
                        value={formData.assetAccountCode}
                        onChange={(e) => setFormData({ ...formData, assetAccountCode: e.target.value })}
                        placeholder="1500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accumDepreciationAccountCode">{t('assets.fields.accumDepreciationAccount')}</Label>
                      <Input
                        id="accumDepreciationAccountCode"
                        value={formData.accumDepreciationAccountCode}
                        onChange={(e) => setFormData({ ...formData, accumDepreciationAccountCode: e.target.value })}
                        placeholder="1510"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depreciationExpenseAccountCode">{t('assets.fields.depreciationExpenseAccount')}</Label>
                      <Input
                        id="depreciationExpenseAccountCode"
                        value={formData.depreciationExpenseAccountCode}
                        onChange={(e) => setFormData({ ...formData, depreciationExpenseAccountCode: e.target.value })}
                        placeholder="6000"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('assets.sections.summary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('assets.fields.purchaseCost')}</Label>
                    <div className="text-2xl font-bold">{formatCurrency(formData.purchaseCost)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('assets.fields.salvageValue')}</Label>
                    <div className="text-xl">{formatCurrency(formData.salvageValue)}</div>
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <Label className="text-muted-foreground">{t('assets.fields.depreciableAmount')}</Label>
                    <div className="text-xl font-semibold">{formatCurrency(depreciableAmount)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('assets.fields.usefulLifeMonths')}</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.usefulLifeMonths} months ({Math.floor(formData.usefulLifeMonths / 12)} years)</span>
                    </div>
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <Label className="text-muted-foreground">{t('assets.fields.monthlyDepreciation')}</Label>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(monthlyDepreciation)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('assets.fields.annualDepreciation')}</Label>
                    <div className="text-xl">{formatCurrency(annualDepreciation)}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>

        {/* Journal Entry Dialog */}
        {showJournalEntry && journalEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-[600px] max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>{t('assets.journalEntry.title')}</CardTitle>
                <CardDescription>{t('assets.journalEntry.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">{t('assets.journalEntry.posted')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('assets.journalEntry.entryNumber')}: {journalEntry.entryNumber}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t('assets.journalEntry.lines')}</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">{t('assets.journalEntry.account')}</th>
                          <th className="text-right p-2">{t('assets.journalEntry.debit')}</th>
                          <th className="text-right p-2">{t('assets.journalEntry.credit')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {journalEntry.lines?.map((line: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{line.accountName}</td>
                            <td className="text-right p-2">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</td>
                            <td className="text-right p-2">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button onClick={() => { setShowJournalEntry(false); navigate('/assets'); }}>
                    {t('common.done')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
