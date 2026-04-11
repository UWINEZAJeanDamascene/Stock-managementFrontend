import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { purchasesApi, suppliersApi, productsApi, budgetsApi, warehousesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Loader2,
  Calculator,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
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

interface Supplier {
  _id: string;
  name: string;
  code?: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code?: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  unit?: string;
  taxRate?: number;
  taxCode?: string;
  trackingType?: 'none' | 'batch' | 'serial';
  trackBatch?: boolean;
  trackSerialNumbers?: boolean;
  defaultWarehouse?: string | { _id: string; name: string };
}

interface BudgetLine {
  _id: string;
  account_id?: string | { _id: string; code: string; name: string; type: string };
  account_name?: string;
  account_code?: string;
  budgeted_amount: number;
  actual_amount: number;
  remaining: number;
}

interface Budget {
  _id: string;
  name: string;
  remaining?: number;
  lines?: BudgetLine[];
}

interface PurchaseLine {
  product: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  unitCost: number;
  discount: number;
  taxCode: string;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  totalWithTax: number;
  warehouse?: string;
  trackingType?: 'none' | 'batch' | 'serial';
  batchNo?: string;
  serialNumber?: string;
  serialNumbers?: string[];
  manufactureDate?: string;
  expiryDate?: string;
  budgetId?: string;
  budget_line_id?: string;
  accountId?: string;
}

interface PurchaseFormData {
  supplier: string;
  currency: string;
  paymentTerms: string;
  purchaseDate: string;
  expectedDeliveryDate: string;
  supplierInvoiceNumber: string;
  supplierInvoiceDate: string;
  notes: string;
  warehouse?: string;
  budgetId?: string;
  budget_line_id?: string;
  accountId?: string;
  items: PurchaseLine[];
}

const CURRENCIES = ['FRW', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'];
const PAYMENT_TERMS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_7', label: 'Credit 7 Days' },
  { value: 'credit_15', label: 'Credit 15 Days' },
  { value: 'credit_30', label: 'Credit 30 Days' },
  { value: 'credit_45', label: 'Credit 45 Days' },
  { value: 'credit_60', label: 'Credit 60 Days' },
];

export default function PurchaseFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudgetLines, setSelectedBudgetLines] = useState<BudgetLine[]>([]);

  const [formData, setFormData] = useState<PurchaseFormData>({
    supplier: '',
    currency: 'FRW',
    paymentTerms: 'cash',
    purchaseDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    supplierInvoiceNumber: '',
    supplierInvoiceDate: '',
    notes: '',
    warehouse: '',
    budgetId: '',
    budget_line_id: '',
    accountId: '',
    items: [],
  });


  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await suppliersApi.getAll({ limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setSuppliers(response.data as Supplier[]);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await productsApi.getAll({ limit: 500 });
      if (response.success && Array.isArray(response.data)) {
        setProducts(response.data as Product[]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await warehousesApi.getAll({ limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setWarehouses(response.data as Warehouse[]);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  }, []);

  const fetchBudgetLines = useCallback(async (budgetId: string) => {
    if (!budgetId || budgetId === 'none') {
      setSelectedBudgetLines([]);
      return;
    }
    try {
      const response = await budgetsApi.getLines(budgetId);
      if (response.success && Array.isArray(response.data)) {
        const lines = response.data.map((line: any) => ({
          _id: line._id,
          account_id: line.account_id,
          account_name: line.account_id?.name || '',
          account_code: line.account_id?.code || '',
          budgeted_amount: line.budgeted_amount || 0,
          actual_amount: line.actual_amount || 0,
          remaining: (line.budgeted_amount || 0) - (line.actual_amount || 0),
        }));
        setSelectedBudgetLines(lines);
      } else {
        setSelectedBudgetLines([]);
      }
    } catch (error) {
      console.error('Failed to fetch budget lines:', error);
      setSelectedBudgetLines([]);
    }
  }, []);

  const fetchPurchase = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await purchasesApi.getById(id);
      if (response.success) {
        const p = response.data as any;
        setFormData({
          supplier: p.supplier?._id || '',
          currency: p.currency || 'FRW',
          paymentTerms: p.paymentTerms || 'cash',
          purchaseDate: p.purchaseDate ? new Date(p.purchaseDate).toISOString().split('T')[0] : '',
          expectedDeliveryDate: p.expectedDeliveryDate ? new Date(p.expectedDeliveryDate).toISOString().split('T')[0] : '',
          supplierInvoiceNumber: p.supplierInvoiceNumber || '',
          supplierInvoiceDate: p.supplierInvoiceDate ? new Date(p.supplierInvoiceDate).toISOString().split('T')[0] : '',
          notes: p.notes || '',
          warehouse: p.warehouse?._id || p.warehouse || '',
          budgetId: p.budgetId || p.budget_id || '',
          budget_line_id: p.budget_line_id || '',
          accountId: p.accountId || p.account_id || '',
          items: p.items?.map((item: any) => ({
            product: item.product?._id || item.product,
            productName: item.product?.name || '',
            productSku: item.product?.sku || '',
            quantity: parseFloat(item.quantity) || 0,
            unitCost: parseFloat(item.unitCost) || 0,
            discount: parseFloat(item.discount) || 0,
            taxCode: item.taxCode || 'A',
            taxRate: parseFloat(item.taxRate) || 0,
            taxAmount: parseFloat(item.taxAmount) || 0,
            subtotal: parseFloat(item.subtotal) || 0,
            totalWithTax: parseFloat(item.totalWithTax) || 0,
            warehouse: item.warehouse?._id || item.warehouse || '',
            trackingType: item.trackingType || 'none',
            batchNo: item.batchNo || '',
            serialNumber: item.serialNumber || '',
            serialNumbers: item.serialNumbers || [],
            manufactureDate: item.manufactureDate ? new Date(item.manufactureDate).toISOString().split('T')[0] : '',
            expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
            budgetId: item.budgetId || p.budgetId || '',
            budget_line_id: item.budget_line_id || p.budget_line_id || '',
            accountId: item.accountId || p.accountId || '',
          })) || [],
        });
        // Fetch budget lines if editing a purchase with a budget
        if (p.budgetId || p.budget_id) {
          fetchBudgetLines(p.budgetId || p.budget_id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch purchase:', error);
    } finally {
      setLoading(false);
    }
  }, [id, fetchBudgetLines]);

  const fetchBudgets = useCallback(async () => {
    try {
      const response = await budgetsApi.getAll({ status: 'approved', limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setBudgets(response.data as Budget[]);
      }
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
    fetchWarehouses();
    fetchBudgets();
  }, [fetchSuppliers, fetchProducts, fetchWarehouses, fetchBudgets]);

  useEffect(() => {
    if (isEdit && id) {
      fetchPurchase();
    }
  }, [isEdit, id, fetchPurchase]);

  const calculateLineTotals = (line: PurchaseLine) => {
    const subtotal = line.quantity * line.unitCost;
    const netAmount = subtotal - line.discount;
    const taxAmount = netAmount * (line.taxRate / 100);
    const totalWithTax = netAmount + taxAmount;
    return { subtotal, taxAmount, totalWithTax };
  };

  const handleLineChange = (index: number, field: keyof PurchaseLine, value: any) => {
    const newLines = [...formData.items];
    newLines[index] = { ...newLines[index], [field]: value };

    if (field === 'quantity' || field === 'unitCost' || field === 'taxRate' || field === 'discount') {
      const calculated = calculateLineTotals(newLines[index]);
      newLines[index].subtotal = calculated.subtotal;
      newLines[index].taxAmount = calculated.taxAmount;
      newLines[index].totalWithTax = calculated.totalWithTax;
    }

    setFormData({ ...formData, items: newLines });
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p._id === productId);
    if (product) {
      setFormData((prev) => {
        const newLines = [...prev.items];
        // Determine tracking type from product
        let trackingType: 'none' | 'batch' | 'serial' = 'none';
        if (product.trackingType) {
          trackingType = product.trackingType;
        } else if (product.trackSerialNumbers) {
          trackingType = 'serial';
        } else if (product.trackBatch) {
          trackingType = 'batch';
        }

        // Get default warehouse for product or use form warehouse
        const defaultWarehouse = product.defaultWarehouse
          ? (typeof product.defaultWarehouse === 'string' ? product.defaultWarehouse : product.defaultWarehouse._id)
          : prev.warehouse;

        newLines[index] = {
          ...newLines[index],
          product: productId,
          productName: product.name,
          productSku: product.sku,
          unitCost: (product as any).cost || (product as any).purchasePrice || 0,
          taxRate: product.taxRate || 0,
          taxCode: product.taxCode || 'A',
          warehouse: defaultWarehouse,
          trackingType,
          batchNo: '',
          serialNumber: '',
          serialNumbers: [],
          manufactureDate: '',
          expiryDate: '',
        };
        const calculated = calculateLineTotals(newLines[index]);
        newLines[index].subtotal = calculated.subtotal;
        newLines[index].taxAmount = calculated.taxAmount;
        newLines[index].totalWithTax = calculated.totalWithTax;
        return { ...prev, items: newLines };
      });
    }
  };

  const addLine = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product: '',
          productName: '',
          productSku: '',
          quantity: 1,
          unitCost: 0,
          discount: 0,
          taxCode: 'A',
          taxRate: 0,
          taxAmount: 0,
          subtotal: 0,
          totalWithTax: 0,
          warehouse: formData.warehouse || '',
          trackingType: 'none',
          batchNo: '',
          serialNumber: '',
          serialNumbers: [],
          manufactureDate: '',
          expiryDate: '',
          budgetId: formData.budgetId || '',
          budget_line_id: formData.budget_line_id || '',
          accountId: formData.accountId || '',
        },
      ],
    });
  };

  const removeLine = (index: number) => {
    const newLines = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newLines });
  };

  const calculateSummary = () => {
    const subtotal = formData.items.reduce((sum, line) => sum + line.subtotal, 0);
    const totalDiscount = formData.items.reduce((sum, line) => sum + line.discount, 0);
    const totalTax = formData.items.reduce((sum, line) => sum + line.taxAmount, 0);
    const grandTotal = subtotal - totalDiscount + totalTax;
    return { subtotal, totalDiscount, totalTax, grandTotal };
  };

  const handleSave = async () => {
    if (!formData.supplier) {
      alert(t('purchase.form.selectSupplier', 'Please select a supplier'));
      return;
    }

    const validLines = formData.items.filter((line) => line.product && line.product.trim() !== '');
    if (validLines.length === 0) {
      alert(t('purchase.form.addProduct', 'Please add at least one product'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        supplier: formData.supplier,
        currency: formData.currency,
        paymentTerms: formData.paymentTerms,
        purchaseDate: formData.purchaseDate,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
        supplierInvoiceNumber: formData.supplierInvoiceNumber || undefined,
        supplierInvoiceDate: formData.supplierInvoiceDate || undefined,
        notes: formData.notes || undefined,
        budgetId: formData.budgetId || undefined,
        budget_line_id: formData.budget_line_id || undefined,
        accountId: formData.accountId || undefined,
        items: validLines.map((line) => ({
          product: line.product,
          quantity: line.quantity,
          unitCost: line.unitCost,
          discount: line.discount,
          taxCode: line.taxCode,
          taxRate: line.taxRate,
          budgetId: line.budgetId || formData.budgetId || undefined,
          budget_line_id: line.budget_line_id || formData.budget_line_id || undefined,
          accountId: line.accountId || formData.accountId || undefined,
        })),
      };

      if (isEdit && id) {
        await purchasesApi.update(id, payload);
      } else {
        await purchasesApi.create(payload, sendEmail);
      }

      navigate('/purchases');
    } catch (error) {
      console.error('Failed to save purchase:', error);
    } finally {
      setSaving(false);
    }
  };

  const summary = calculateSummary();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency,
    }).format(amount);
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
          <Button variant="outline" onClick={() => navigate('/purchases')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEdit
              ? t('purchase.form.editTitle', 'Edit Purchase')
              : t('purchase.form.createTitle', 'New Purchase')}
          </h1>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Info */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('purchase.form.header', 'Purchase Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('purchase.form.supplier', 'Supplier')} *</Label>
                    <Select
                      value={formData.supplier || undefined}
                      onValueChange={(value) => setFormData({ ...formData, supplier: value })}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                        <SelectValue placeholder={t('purchase.form.selectSupplier', 'Select supplier')} />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier._id} value={supplier._id} className="dark:text-slate-200">
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('purchase.form.currency', 'Currency')}</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency} className="dark:text-slate-200">
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('purchase.form.purchaseDate', 'Purchase Date')}</Label>
                    <Input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('purchase.form.expectedDelivery', 'Expected Delivery')}</Label>
                    <Input
                      type="date"
                      value={formData.expectedDeliveryDate}
                      onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('purchase.form.paymentTerms', 'Payment Terms')}</Label>
                    <Select
                      value={formData.paymentTerms}
                      onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {PAYMENT_TERMS.map((term) => (
                          <SelectItem key={term.value} value={term.value} className="dark:text-slate-200">
                            {term.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('purchase.form.warehouse', 'Warehouse')}</Label>
                    <Select
                      value={formData.warehouse || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, warehouse: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="none">{t('common.select', 'Select...')}</SelectItem>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse._id} value={warehouse._id} className="dark:text-slate-200">
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('purchase.form.supplierInvoice', 'Supplier Invoice #')}</Label>
                    <Input
                      value={formData.supplierInvoiceNumber}
                      onChange={(e) => setFormData({ ...formData, supplierInvoiceNumber: e.target.value })}
                      placeholder="Supplier invoice number"
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('purchase.form.notes', 'Notes')}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('purchase.form.notesPlaceholder', 'Add any notes...')}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-900 dark:text-white">Budget</Label>
                    <Select
                      value={formData.budgetId || undefined}
                      onValueChange={(value) => {
                        const newBudgetId = value === 'none' ? undefined : value;
                        setFormData({ ...formData, budgetId: newBudgetId, budget_line_id: undefined, accountId: undefined });
                        if (value && value !== 'none') {
                          fetchBudgetLines(value);
                        } else {
                          setSelectedBudgetLines([]);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                        <SelectValue placeholder="Select budget (optional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="none" className="dark:text-slate-200">No Budget</SelectItem>
                        {budgets.map((budget) => (
                          <SelectItem key={budget._id} value={budget._id} className="dark:text-slate-200">
                            {budget.name} (${(budget.remaining || 0).toLocaleString()} left)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedBudgetLines.length > 0 && (
                    <div>
                      <Label className="text-slate-900 dark:text-white">Budget Line (Account)</Label>
                      <Select
                        value={formData.budget_line_id || undefined}
                        onValueChange={(value) => {
                          const selectedLine = selectedBudgetLines.find(l => l._id === value);
                          const accountId = selectedLine?.account_id 
                            ? (typeof selectedLine.account_id === 'object' ? (selectedLine.account_id as any)._id : selectedLine.account_id)
                            : undefined;
                          setFormData({ 
                            ...formData, 
                            budget_line_id: value === 'none' ? undefined : value,
                            accountId: value === 'none' ? undefined : accountId
                          });
                        }}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                          <SelectValue placeholder="Select budget line" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <SelectItem value="none" className="dark:text-slate-200">No Line</SelectItem>
                          {selectedBudgetLines.map((line) => {
                            const accountId = line.account_id 
                              ? (typeof line.account_id === 'object' ? (line.account_id as any)._id : line.account_id)
                              : '';
                            const accountName = line.account_id && typeof line.account_id === 'object' 
                              ? (line.account_id as any).name 
                              : (line.account_name || '');
                            const accountCode = line.account_id && typeof line.account_id === 'object' 
                              ? (line.account_id as any).code 
                              : (line.account_code || '');
                            return (
                              <SelectItem key={line._id} value={line._id} className="dark:text-slate-200">
                                {accountName || accountCode || 'Unnamed'} (${(line.remaining || 0).toLocaleString()} left)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('purchase.form.lines', 'Line Items')}</CardTitle>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('purchase.form.addLine', 'Add Line')}
                </Button>
              </CardHeader>
              <CardContent>
                {formData.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                    <Calculator className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('purchase.form.noLines', 'No line items. Click "Add Line" to add products.')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700">
                        <TableHead style={{ width: 250 }} className="dark:text-white">{t('purchase.form.product', 'Product')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.qty', 'Qty')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.unitCost', 'Unit Cost')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.discount', 'Discount')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.taxRate', 'Tax %')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.tax', 'Tax')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.total', 'Total')}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.items.map((line, index) => (
                        <TableRow key={index} className="dark:hover:bg-slate-700/50">
                          <TableCell>
                            <Select value={line.product} onValueChange={(value) => handleProductSelect(index, value)}>
                              <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                                <SelectValue placeholder={t('purchase.form.selectProduct', 'Select product...')} />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                {products.map((product) => (
                                  <SelectItem key={product._id} value={product._id} className="dark:text-slate-200">
                                    {product.name} ({product.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.0001"
                              step="any"
                              className="w-20 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                              value={line.quantity}
                              onChange={(e) =>
                                handleLineChange(index, 'quantity', parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-24 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                              value={line.unitCost}
                              onChange={(e) =>
                                handleLineChange(index, 'unitCost', parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-20 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                              value={line.discount}
                              onChange={(e) =>
                                handleLineChange(index, 'discount', parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              className="w-16 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                              value={line.taxRate}
                              onChange={(e) =>
                                handleLineChange(index, 'taxRate', parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right dark:text-slate-300">{formatCurrency(line.taxAmount)}</TableCell>
                          <TableCell className="font-medium dark:text-slate-200">{formatCurrency(line.totalWithTax)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeLine(index)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div>
            <Card className="sticky top-6 dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('purchase.form.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">{t('purchase.form.subtotal', 'Subtotal')}</span>
                  <span className="font-medium dark:text-slate-200">{formatCurrency(summary.subtotal)}</span>
                </div>
                {summary.totalDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('purchase.form.discount', 'Discount')}</span>
                    <span className="font-medium dark:text-slate-200">-{formatCurrency(summary.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">{t('purchase.form.tax', 'Tax')}</span>
                  <span className="font-medium dark:text-slate-200">{formatCurrency(summary.totalTax)}</span>
                </div>
                <div className="border-t pt-4 dark:border-slate-600 flex justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{t('purchase.form.total', 'Total')}</span>
                  <span className="font-bold text-lg text-slate-900 dark:text-white">{formatCurrency(summary.grandTotal)}</span>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <input
                    type="checkbox"
                    id="sendEmailPurchase"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="sendEmailPurchase" className="cursor-pointer text-sm">
                    Send email to supplier
                  </Label>
                </div>

                <div className="space-y-2 pt-2">
                  <Button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {isEdit
                      ? t('purchase.form.update', 'Update Purchase')
                      : t('purchase.form.save', 'Save Purchase')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
