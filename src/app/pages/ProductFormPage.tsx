import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { productsApi, categoriesApi, suppliersApi, warehousesApi, stockApi, chartOfAccountsApi } from '@/lib/api';
import { Layout } from '../layout/Layout';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  Package,
  DollarSign,
  Settings,
  Warehouse
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Category {
  _id: string;
  name: string;
  children?: Category[];
  parent?: string | null;
}

interface Supplier {
  _id: string;
  name: string;
  code: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

interface ChartAccount {
  _id?: string;
  code: string;
  accountCode?: string;
  name: string;
  accountName?: string;
  type: string;
  accountType?: string;
  subtype?: string;
}

interface ProductFormData {
  name: string;
  sku: string;
  barcode: string;
  barcodeType: string;
  description: string;
  category: string;
  unit: string;
  supplier: string;
  preferredSupplier: string;
  isStockable: boolean;
  costPrice: string;
  averageCost: string;
  sellingPrice: string;
  taxCode: string;
  taxRate: string;
  costingMethod: string;
  reorderPoint: string;
  reorderQuantity: string;
  lowStockThreshold: string;
  brand: string;
  location: string;
  weight: string;
  trackingType: string;
  defaultWarehouse: string;
  inventory_account_id: string;
  cogs_account_id: string;
  revenue_account_id: string;
}

// Unit options - will be translated in the render
const UNIT_OPTIONS = ['kg', 'g', 'pcs', 'box', 'm', 'm²', 'm³', 'l', 'ml', 'ton', 'bag', 'roll', 'sheet', 'set'];

// Get translated options helper
const getUnitLabel = (t: Function, unit: string) => t(`products.units.${unit}`) || unit;
const getCostingMethodLabel = (t: Function, value: string) => t(`products.costingMethods.${value}`) || value;
const getTaxCodeLabel = (t: Function, value: string) => t(`products.taxCodes.${value}`) || value;
const getTrackingTypeLabel = (t: Function, value: string) => t(`products.trackingTypes.${value}`) || value;

// Option arrays for selects
const TAX_CODE_VALUES = ['A', 'B', 'None'];
const COSTING_METHOD_VALUES = ['fifo', 'weighted', 'wac', 'avg'];
const TRACKING_TYPE_VALUES = ['none', 'batch', 'serial'];
const BARCODE_TYPE_VALUES = ['CODE128', 'EAN13', 'EAN8', 'UPC', 'CODE39', 'ITF14', 'QR', 'NONE'];

const getBarcodeTypeLabel = (t: Function, value: string) => {
  if (!value) return '';
  // Try exact key, then lowercase key, then fallback to raw value
  return t(`products.barcodeTypes.${value}`) || t(`products.barcodeTypes.${value.toLowerCase()}`) || value;
};

// Flatten nested category tree for dropdown display
const flattenCategories = (cats: Category[], prefix = ''): { _id: string; label: string }[] => {
  const result: { _id: string; label: string }[] = [];
  for (const cat of cats) {
    const label = prefix ? `${prefix} > ${cat.name}` : cat.name;
    result.push({ _id: cat._id, label });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, label));
    }
  }
  return result;
};

export default function ProductFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<{ _id: string; label: string }[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [costingMethodLocked, setCostingMethodLocked] = useState(false);
  const [skuWarning, setSkuWarning] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    barcode: '',
    barcodeType: 'CODE128',
    description: '',
    category: '',
    unit: 'pcs',
    supplier: '',
    preferredSupplier: '',
    isStockable: true,
    costPrice: '0',
    averageCost: '0',
    sellingPrice: '0',
    taxCode: 'A',
    taxRate: '0',
    costingMethod: 'fifo',
    reorderPoint: '10',
    reorderQuantity: '10',
    lowStockThreshold: '10',
    brand: '',
    location: '',
    weight: '0',
    trackingType: 'none',
    defaultWarehouse: '',
    inventory_account_id: '',
    cogs_account_id: '',
    revenue_account_id: '',
  });

  useEffect(() => {
    loadCategories();
    loadSuppliers();
    loadWarehouses();
    loadAccounts();
    if (isEditMode) {
      loadProduct();
    }
  }, [id]);

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      if (response.success && response.data) {
        const raw = response.data as any;
        const cats = Array.isArray(raw) ? raw : [];
        setCategories(cats);
        setFlatCategories(flattenCategories(cats));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await suppliersApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        setSuppliers(response.data as Supplier[]);
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await warehousesApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        // Handle both array and paginated response formats
        const warehousesData = Array.isArray(response.data) ? response.data : (response.data as any)?.data || [];
        setWarehouses(warehousesData as Warehouse[]);
      }
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      console.log('[ProductForm] Loading accounts...');
      const response = await chartOfAccountsApi.getAll({ isActive: true });
      console.log('[ProductForm] Accounts API response:', response);
      if (response.success && response.data) {
        const accountsData = Array.isArray(response.data) ? response.data : [];
        console.log('[ProductForm] Loaded accounts count:', accountsData.length);
        setAccounts(accountsData as ChartAccount[]);
      } else {
        console.log('[ProductForm] Accounts API returned no data:', response);
        setAccounts([]);
      }
    } catch (error) {
      console.error('[ProductForm] Failed to load accounts:', error);
      setAccounts([]);
    }
  };

  const loadProduct = async () => {
    setInitialLoading(true);
    try {
      const response = await productsApi.getById(id!);
      if (response.success && response.data) {
        const product = response.data as any;
        setFormData({
          name: product.name || '',
          sku: product.sku || '',
          barcode: product.barcode || '',
          barcodeType: product.barcodeType || 'CODE128',
          description: product.description || '',
          category: product.category?._id || product.category || '',
          unit: product.unit || 'pcs',
          supplier: product.supplier?._id || product.supplier || '',
          preferredSupplier: product.preferredSupplier?._id || product.preferredSupplier || '',
          isStockable: product.isStockable !== false,
          costPrice: String(product.costPrice || 0),
          averageCost: String(product.averageCost || 0),
          sellingPrice: String(product.sellingPrice || 0),
          taxCode: product.taxCode || 'A',
          taxRate: String(product.taxRate || 0),
          costingMethod: product.costingMethod || 'fifo',
          reorderPoint: String(product.reorderPoint || 10),
          reorderQuantity: String(product.reorderQuantity || 10),
          lowStockThreshold: String(product.lowStockThreshold || 10),
          brand: product.brand || '',
          location: product.location || '',
          weight: String(product.weight || 0),
          trackingType: product.trackingType || 'none',
          defaultWarehouse: product.defaultWarehouse?._id || product.defaultWarehouse || '',
          inventory_account_id: product.inventory_account_id || product.inventoryAccount || '',
          cogs_account_id: product.cogs_account_id || product.cogsAccount || '',
          revenue_account_id: product.revenue_account_id || product.revenueAccount || ''
        });
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      toast.error('Failed to load product');
      navigate('/products');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Check if costing method should be locked (product has stock movements)
  useEffect(() => {
    if (isEditMode && id) {
      const checkStockMovements = async () => {
        try {
          const response = await stockApi.getMovements({ productId: id, limit: 1 });
          if (response.success && response.data) {
            const data = response.data as any;
            const movements = Array.isArray(data) ? data : data.movements || [];
            if (movements.length > 0) {
              setCostingMethodLocked(true);
            }
          }
        } catch (error) {
          // If we can't check, don't lock - let backend handle validation
        }
      };
      checkStockMovements();
    }
  }, [id, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('products.nameRequired') || 'Product name is required');
      return;
    }
    if (!formData.sku.trim()) {
      toast.error(t('products.skuRequired') || 'SKU is required');
      return;
    }
    if (!formData.category) {
      toast.error(t('products.categoryRequired') || 'Category is required');
      return;
    }

    // Validate accounting fields are required by backend
    if (!formData.inventory_account_id) {
      toast.error(t('products.inventoryAccountRequired') || 'Inventory Account is required');
      return;
    }
    if (!formData.cogs_account_id) {
      toast.error(t('products.cogsAccountRequired') || 'COGS Account is required');
      return;
    }
    if (!formData.revenue_account_id) {
      toast.error(t('products.revenueAccountRequired') || 'Revenue Account is required');
      return;
    }

    setSaving(true);
    try {
      console.log('[ProductForm] Submitting product with data:', formData);
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        barcode: formData.barcode.trim() || null,
        barcodeType: formData.barcodeType,
        description: formData.description.trim() || null,
        category: formData.category,
        unit: formData.unit,
        supplier: formData.supplier || null,
        preferredSupplier: formData.preferredSupplier || null,
        isStockable: formData.isStockable,
        costPrice: parseFloat(formData.costPrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        taxCode: formData.taxCode,
        taxRate: parseFloat(formData.taxRate) || 0,
        costingMethod: formData.costingMethod,
        reorderPoint: parseFloat(formData.reorderPoint) || 0,
        reorderQuantity: parseFloat(formData.reorderQuantity) || 0,
        lowStockThreshold: parseFloat(formData.lowStockThreshold) || 10,
        brand: formData.brand.trim() || null,
        location: formData.location.trim() || null,
        weight: parseFloat(formData.weight) || 0,
        trackingType: formData.trackingType,
        defaultWarehouse: formData.defaultWarehouse || null,
        inventoryAccount: formData.inventory_account_id || null,
        cogsAccount: formData.cogs_account_id || null,
        revenueAccount: formData.revenue_account_id || null,
      };

      let response;
      if (isEditMode) {
        response = await productsApi.update(id!, payload);
      } else {
        response = await productsApi.create(payload);
      }
      console.log('[ProductForm] API response:', response);

      if (response.success) {
        toast.success(isEditMode ? t('products.updated') || 'Product updated successfully' : t('products.created') || 'Product created successfully');
        navigate('/products');
      } else {
        toast.error((response as any).message || t('products.saveFailed') || 'Failed to save product');
      }
    } catch (error: any) {
      console.error('[ProductForm] Save failed:', error);
      // Handle costing method locked error specifically
      if (error?.status === 409 || error?.message?.includes('COSTING_METHOD_LOCKED') || error?.message?.includes('costing_method')) {
        toast.error(t('products.costingMethodLocked') || 'Cannot change costing method: this product already has stock movements. The costing method is locked to prevent data inconsistency.');
        setCostingMethodLocked(true);
      } else if (error?.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = Object.entries(errors)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        toast.error(errorMessages);
      } else {
        toast.error(error.message || t('products.saveFailed') || 'Failed to save product');
      }
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 max-w-5xl overflow-x-hidden">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/products')} className="dark:text-slate-200 dark:hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back') || 'Back'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isEditMode ? t('products.editProduct') || 'Edit Product' : t('products.newProduct') || 'New Product'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isEditMode ? t('products.editSubtitle') || 'Update product information' : t('products.createSubtitle') || 'Add a new product to your inventory'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-x-hidden">
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Package className="h-5 w-5" />
                  {t('products.basicInfo') || 'Basic Information'}
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {t('products.basicInfoDesc') || 'Core product details'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="dark:text-slate-200">{t('products.productName') || 'Product Name'} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder={t('products.namePlaceholder') || 'Enter product name'}
                    required
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sku" className="dark:text-slate-200">{t('products.sku') || 'SKU'} *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => {
                      handleChange('sku', e.target.value.toUpperCase());
                      setSkuWarning(null);
                    }}
                    placeholder={t('products.skuPlaceholder') || 'e.g., PRD-001'}
                    required
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                  />
                  {skuWarning && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">{skuWarning}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode" className="dark:text-slate-200">{t('products.barcode') || 'Barcode'}</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => handleChange('barcode', e.target.value)}
                    placeholder={t('products.barcodePlaceholder') || 'Scan or enter barcode'}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcodeType" className="dark:text-slate-200">{t('products.barcodeType') || 'Barcode Type'}</Label>
                  <Select 
                    value={formData.barcodeType} 
                    onValueChange={(value) => handleChange('barcodeType', value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {BARCODE_TYPE_VALUES.map((type) => (
                        <SelectItem key={type} value={type} className="dark:text-slate-200">{getBarcodeTypeLabel(t, type)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="dark:text-slate-200">{t('products.category') || 'Category'} *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => handleChange('category', value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder={t('products.selectCategory') || 'Select category'} />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {flatCategories.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id} className="dark:text-slate-200">{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit" className="dark:text-slate-200">{t('products.unit') || 'Unit of Measure'} *</Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(value) => handleChange('unit', value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {UNIT_OPTIONS.map((unit) => (
                        <SelectItem key={unit} value={unit} className="dark:text-slate-200">{getUnitLabel(t, unit)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier" className="dark:text-slate-200">{t('products.supplier') || 'Supplier'}</Label>
                  <Select 
                    value={formData.supplier} 
                    onValueChange={(value) => handleChange('supplier', value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder={t('products.selectSupplier') || 'Select supplier'} />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {suppliers.map((sup) => (
                        <SelectItem key={sup._id} value={sup._id} className="dark:text-slate-200">{sup.name} ({sup.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="preferredSupplier" className="dark:text-slate-200">{t('products.preferredSupplier') || 'Preferred Supplier'}</Label>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs dark:bg-slate-800 dark:border-slate-700">
                          <p className="font-semibold dark:text-white">Preferred Supplier</p>
                          <p className="text-sm mt-1 dark:text-slate-300">Set a default supplier for purchase orders. You can still select other suppliers when creating orders.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select 
                      value={formData.preferredSupplier} 
                      onValueChange={(value) => handleChange('preferredSupplier', value)}
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder={t('products.selectPreferredSupplier') || 'Select preferred supplier'} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {suppliers.map((sup) => (
                          <SelectItem key={sup._id} value={sup._id} className="dark:text-slate-200">{sup.name} ({sup.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TooltipProvider>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description" className="dark:text-slate-200">{t('products.description') || 'Description'}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder={t('products.descriptionPlaceholder') || 'Enter product description'}
                    rows={3}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <DollarSign className="h-5 w-5" />
                  {t('products.pricing') || 'Pricing'}
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {t('products.pricingDesc') || 'Cost and selling price configuration'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="costPrice" className="dark:text-slate-200">{t('products.costPrice') || 'Cost Price'}</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => handleChange('costPrice', e.target.value)}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellingPrice" className="dark:text-slate-200">{t('products.sellingPrice') || 'Selling Price'}</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellingPrice}
                    onChange={(e) => handleChange('sellingPrice', e.target.value)}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxCode" className="dark:text-slate-200">{t('products.taxCode') || 'Tax Code'}</Label>
                  <Select 
                    value={formData.taxCode} 
                    onValueChange={(value) => handleChange('taxCode', value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {TAX_CODE_VALUES.map((code) => (
                        <SelectItem key={code} value={code} className="dark:text-slate-200">{getTaxCodeLabel(t, code)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxRate" className="dark:text-slate-200">{t('products.taxRate') || 'Tax Rate (%)'}</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => handleChange('taxRate', e.target.value)}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Accounting */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Settings className="h-5 w-5" />
                  {t('products.accounting') || 'Accounting'}
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {t('products.accountingDesc') || 'Map product to inventory, COGS, and revenue accounts for accurate financial tracking'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <TooltipProvider>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="inventory_account_id" className="dark:text-slate-200">{t('products.inventoryAccount') || 'Inventory Account'}</Label>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs dark:bg-slate-800 dark:border-slate-700">
                          <p className="font-semibold dark:text-white">Inventory Account (Asset)</p>
                          <p className="text-sm mt-1 dark:text-slate-300">This account tracks the value of inventory on hand. When stock is purchased, the inventory value increases here. Typically a current asset account (e.g., 1400 - Inventory).</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select 
                      value={formData.inventory_account_id} 
                      onValueChange={(value) => handleChange('inventory_account_id', value)}
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder={t('products.selectAccount') || 'Select account'} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {(accounts || []).filter(a => a.type === 'asset').map((account) => (
                          <SelectItem key={account.code} value={account.code} className="dark:text-slate-200">{account.code} - {account.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="cogs_account_id" className="dark:text-slate-200">{t('products.cogsAccount') || 'COGS Account'}</Label>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs dark:bg-slate-800 dark:border-slate-700">
                          <p className="font-semibold dark:text-white">Cost of Goods Sold (Expense)</p>
                          <p className="text-sm mt-1 dark:text-slate-300">This account tracks the cost of products sold. When inventory is sold, the cost is moved from Inventory to COGS. Typically an expense account (e.g., 5000 - Cost of Sales).</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select 
                      value={formData.cogs_account_id} 
                      onValueChange={(value) => handleChange('cogs_account_id', value)}
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder={t('products.selectAccount') || 'Select account'} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {(accounts || []).filter(a => a.type === 'cogs').map((account) => (
                          <SelectItem key={account.code} value={account.code} className="dark:text-slate-200">{account.code} - {account.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="revenue_account_id" className="dark:text-slate-200">{t('products.revenueAccount') || 'Revenue Account'}</Label>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs dark:bg-slate-800 dark:border-slate-700">
                          <p className="font-semibold dark:text-white">Sales/Revenue Account (Income)</p>
                          <p className="text-sm mt-1 dark:text-slate-300">This account records the revenue from product sales. When a product is sold, the sales amount is recorded here. Typically an income/revenue account (e.g., 4000 - Sales Revenue).</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select 
                      value={formData.revenue_account_id} 
                      onValueChange={(value) => handleChange('revenue_account_id', value)}
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder={t('products.selectAccount') || 'Select account'} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {(accounts || []).filter(a => a.type === 'revenue').map((account) => (
                          <SelectItem key={account.code} value={account.code} className="dark:text-slate-200">{account.code} - {account.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Warehouse className="h-5 w-5" />
                  {t('products.inventory') || 'Inventory'}
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {t('products.inventoryDesc') || 'Stock and inventory settings'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <TooltipProvider>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="costingMethod" className="dark:text-slate-200">{t('products.costingMethod') || 'Costing Method'}</Label>
                      {costingMethodLocked && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                          {t('products.locked') || 'Locked'}
                        </Badge>
                      )}
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs dark:bg-slate-800 dark:border-slate-700">
                          <p className="font-semibold dark:text-white">Inventory Costing Method</p>
                          {costingMethodLocked ? (
                            <p className="text-sm mt-1 text-amber-600 dark:text-amber-400">This setting is locked because the product already has stock movements. Changing it would cause data inconsistency.</p>
                          ) : (
                            <>
                              <p className="text-sm mt-1 dark:text-slate-300">Determines how inventory costs are calculated:</p>
                              <ul className="text-sm mt-1 list-disc pl-4 dark:text-slate-300">
                                <li><strong className="dark:text-white">FIFO</strong> - First In, First Out (oldest inventory sold first)</li>
                                <li><strong className="dark:text-white">WAC</strong> - Weighted Average Cost</li>
                                <li><strong className="dark:text-white">AVG</strong> - Average Cost</li>
                                <li><strong className="dark:text-white">Weighted</strong> - Weighted average</li>
                              </ul>
                            </>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select 
                      value={formData.costingMethod} 
                      onValueChange={(value) => handleChange('costingMethod', value)}
                      disabled={costingMethodLocked}
                    >
                      <SelectTrigger className={`${costingMethodLocked ? 'opacity-60 cursor-not-allowed' : ''} dark:bg-slate-700 dark:text-white dark:border-slate-600`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {COSTING_METHOD_VALUES.map((method) => (
                          <SelectItem key={method} value={method} className="dark:text-slate-200">{getCostingMethodLabel(t, method)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {costingMethodLocked && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {t('products.costingMethodLockedHint') || 'Costing method cannot be changed because stock movements exist for this product.'}
                      </p>
                    )}
                  </TooltipProvider>
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="trackingType" className="dark:text-slate-200">{t('products.trackingType') || 'Tracking Type'}</Label>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs dark:bg-slate-800 dark:border-slate-700">
                          <p className="font-semibold dark:text-white">Inventory Tracking</p>
                          <p className="text-sm mt-1 dark:text-slate-300">Choose how to track individual items:</p>
                          <ul className="text-sm mt-1 list-disc pl-4 dark:text-slate-300">
                            <li><strong className="dark:text-white">None</strong> - Simple tracking (qty only)</li>
                            <li><strong className="dark:text-white">Batch</strong> - Track by batch/lot numbers</li>
                            <li><strong className="dark:text-white">Serial</strong> - Track each unit individually</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select 
                      value={formData.trackingType} 
                      onValueChange={(value) => handleChange('trackingType', value)}
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {TRACKING_TYPE_VALUES.map((type) => (
                          <SelectItem key={type} value={type} className="dark:text-slate-200">{getTrackingTypeLabel(t, type)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TooltipProvider>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <TooltipProvider>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="isStockable" className="dark:text-slate-200">{t('products.isStockable') || 'Track Inventory'}</Label>
                        <Tooltip>
                          <TooltipTrigger><HelpCircle className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                          <TooltipContent className="max-w-xs dark:bg-slate-800 dark:border-slate-700">
                            <p className="font-semibold dark:text-white">Track Inventory</p>
                            <p className="text-sm mt-1 dark:text-slate-300">Enable to track stock levels for this product. Disable for services or non-inventory items.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('products.isStockableDesc') || 'Track stock levels for this product'}
                      </p>
                    </div>
                    <Switch
                      id="isStockable"
                      checked={formData.isStockable}
                      onCheckedChange={(checked) => handleChange('isStockable', checked)}
                    />
                  </TooltipProvider>
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="reorderPoint" className="dark:text-slate-200">{t('products.reorderPoint') || 'Reorder Point'}</Label>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs dark:bg-slate-800 dark:border-slate-700">
                          <p className="font-semibold dark:text-white">Reorder Point</p>
                          <p className="text-sm mt-1 dark:text-slate-300">Stock level that triggers a reorder suggestion. When stock reaches or falls below this level, the system will suggest reordering. Usually set slightly above the low stock threshold.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="reorderPoint"
                      type="number"
                      min="0"
                      value={formData.reorderPoint}
                      onChange={(e) => handleChange('reorderPoint', e.target.value)}
                      disabled={!formData.isStockable}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                    />
                  </TooltipProvider>
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="reorderQuantity" className="dark:text-slate-200">{t('products.reorderQuantity') || 'Reorder Quantity'}</Label>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs dark:bg-slate-800 dark:border-slate-700">
                          <p className="font-semibold dark:text-white">Reorder Quantity</p>
                          <p className="text-sm mt-1 dark:text-slate-300">Suggested quantity to order when stock reaches the reorder point. This is the default quantity that will appear in purchase suggestions.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="reorderQuantity"
                      type="number"
                      min="0"
                      value={formData.reorderQuantity}
                      onChange={(e) => handleChange('reorderQuantity', e.target.value)}
                      disabled={!formData.isStockable}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                    />
                  </TooltipProvider>
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="lowStockThreshold" className="dark:text-slate-200">{t('products.lowStockThreshold') || 'Low Stock Alert'}</Label>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs dark:bg-slate-800 dark:border-slate-700">
                          <p className="font-semibold dark:text-white">Low Stock Threshold</p>
                          <p className="text-sm mt-1 dark:text-slate-300">When inventory falls to or below this number, you'll receive a low stock alert notification. Default is 10 units.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      min="0"
                      value={formData.lowStockThreshold}
                      onChange={(e) => handleChange('lowStockThreshold', e.target.value)}
                      disabled={!formData.isStockable}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                    />
                  </TooltipProvider>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultWarehouse" className="dark:text-slate-200">{t('products.defaultWarehouse') || 'Default Warehouse'}</Label>
                  <Select 
                    value={formData.defaultWarehouse} 
                    onValueChange={(value) => handleChange('defaultWarehouse', value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder={t('products.selectWarehouse') || 'Select warehouse'} />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {warehouses.map((wh: any) => (
                        <SelectItem key={wh._id} value={wh._id} className="dark:text-slate-200">{wh.name} ({wh.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand" className="dark:text-slate-200">{t('products.brand') || 'Brand'}</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    placeholder={t('products.brandPlaceholder') || 'Enter brand name'}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="dark:text-slate-200">{t('products.location') || 'Storage Location'}</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder={t('products.locationPlaceholder') || 'e.g., Warehouse A, Shelf 3'}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight" className="dark:text-slate-200">{t('products.weight') || 'Weight'}</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.weight}
                    onChange={(e) => handleChange('weight', e.target.value)}
                    placeholder={t('products.weightPlaceholder') || 'Weight in kg'}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/products')} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.saving') || 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditMode ? t('common.update') || 'Update' : t('common.create') || 'Create'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}