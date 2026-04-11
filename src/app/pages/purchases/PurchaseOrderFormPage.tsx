import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { purchaseOrdersApi, suppliersApi, warehousesApi, productsApi, budgetsApi, chartOfAccountsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  Save, 
  Send,
  Plus, 
  Trash2,
  Loader2,
  Calculator
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
  TableRow 
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
  costPrice?: number | string;
  averageCost?: number | string;
  taxRate?: number | string;
  taxCode?: string;
}

interface POLine {
  _id?: string;
  product: string;
  productName?: string;
  qtyOrdered: number;
  unitCost: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  budgetId?: string;
  budget_line_id?: string;
  accountId?: string;
}

interface PurchaseOrderFormData {
  supplier: string;
  warehouse: string;
  orderDate: string;
  expectedDeliveryDate: string;
  currencyCode: string;
  notes: string;
  lines: POLine[];
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'RWF', 'KES', 'UGX', 'TZS'];

export default function PurchaseOrderFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);

  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    supplier: '',
    warehouse: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    currencyCode: 'FRW',
    notes: '',
    lines: [],
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

  const fetchBudgets = useCallback(async () => {
    try {
      // Fetch all approved budgets
      const response = await budgetsApi.getAll({ status: 'approved' });
      if (response.success && Array.isArray(response.data)) {
        console.log('[PO Form] Fetched budgets:', response.data.length, response.data.map((b: any) => ({ name: b.name, type: b.type, status: b.status })));
        setBudgets(response.data);
      } else {
        console.log('[PO Form] No budgets returned:', response);
      }
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
    }
  }, []);

  const fetchExpenseAccounts = useCallback(async () => {
    try {
      // Fetch all active accounts and filter for expense/COGS (matching budget form logic)
      const response = await chartOfAccountsApi.getAll({ isActive: true });
      if (response.success && Array.isArray(response.data)) {
        // Filter for expense and COGS accounts only (matching budget form logic)
        const filteredAccounts = response.data.filter((acc: any) => {
          return ['expense', 'cogs'].includes(acc.type?.toLowerCase());
        });
        console.log('[PO Form] Fetched expense accounts:', filteredAccounts.length, filteredAccounts.map((a: any) => ({ code: a.code, name: a.name, type: a.type })));
        setExpenseAccounts(filteredAccounts);
      } else {
        console.log('[PO Form] No accounts returned:', response);
      }
    } catch (error) {
      console.error('Failed to fetch expense accounts:', error);
    }
  }, []);

  const fetchPurchaseOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await purchaseOrdersApi.getById(id);
      if (response.success) {
        const po = response.data as any;
        setFormData({
          supplier: po.supplier?._id || '',
          warehouse: po.warehouse?._id || '',
          orderDate: po.orderDate ? new Date(po.orderDate).toISOString().split('T')[0] : '',
          expectedDeliveryDate: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString().split('T')[0] : '',
          currencyCode: po.currencyCode || 'FRW',
          notes: po.notes || '',
          lines: po.lines?.map((line: any) => ({
            _id: line._id,
            product: line.product?._id || line.product,
            productName: line.product?.name,
            qtyOrdered: line.qtyOrdered || 0,
            unitCost: line.unitCost || 0,
            taxRate: line.taxRate || 0,
            taxAmount: line.taxAmount || 0,
            lineTotal: line.lineTotal || 0,
            budgetId: line.budgetId || '',
            accountId: line.accountId || '',
          })) || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch purchase order:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSuppliers();
    fetchWarehouses();
    fetchProducts();
    fetchBudgets();
    fetchExpenseAccounts();
  }, [fetchSuppliers, fetchWarehouses, fetchProducts, fetchBudgets, fetchExpenseAccounts]);

  useEffect(() => {
    if (isEdit && id) {
      fetchPurchaseOrder();
    }
  }, [isEdit, id, fetchPurchaseOrder]);

  const calculateLineTotals = (line: POLine) => {
    const subtotal = line.qtyOrdered * line.unitCost;
    const tax = subtotal * (line.taxRate / 100);
    return {
      taxAmount: tax,
      lineTotal: subtotal + tax,
    };
  };

  const handleLineChange = (index: number, field: keyof POLine, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Auto-calculate line totals
    if (field === 'qtyOrdered' || field === 'unitCost' || field === 'taxRate') {
      const calculated = calculateLineTotals(newLines[index]);
      newLines[index].taxAmount = calculated.taxAmount;
      newLines[index].lineTotal = calculated.lineTotal;
    }
    
    setFormData({ ...formData, lines: newLines });
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      const unitCost = parseFloat(String(product.costPrice || product.averageCost || 0)) || 0;
      const taxRate = parseFloat(String(product.taxRate || 0)) || 0;
      setFormData(prev => {
        const newLines = [...prev.lines];
        const subtotal = (newLines[index].qtyOrdered || 1) * unitCost;
        const taxAmount = subtotal * (taxRate / 100);
        newLines[index] = {
          ...newLines[index],
          product: productId,
          productName: product.name,
          unitCost,
          taxRate,
          taxAmount,
          lineTotal: subtotal + taxAmount,
        };
        return { ...prev, lines: newLines };
      });
    }
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        {
          product: '',
          qtyOrdered: 1,
          unitCost: 0,
          taxRate: 0,
          taxAmount: 0,
          lineTotal: 0,
        },
      ],
    });
  };

  const removeLine = (index: number) => {
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: newLines });
  };

  const calculateSummary = () => {
    const subtotal = formData.lines.reduce((sum, line) => sum + (line.qtyOrdered * line.unitCost), 0);
    const tax = formData.lines.reduce((sum, line) => sum + line.taxAmount, 0);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSave = async (submitForApproval: boolean = false) => {
    if (!formData.supplier) {
      alert(t('purchase.form.selectSupplier', 'Please select a supplier'));
      return;
    }

    // Filter out incomplete lines (no product selected)
    const validLines = formData.lines.filter(line => line.product && line.product.trim() !== '');
    if (validLines.length === 0) {
      alert(t('purchase.form.addProduct', 'Please add at least one product'));
      return;
    }

    setSaving(true);
    try {
      // Calculate all line totals before saving
      const linesWithTotals = validLines.map(line => {
        const calculated = calculateLineTotals(line);
        return {
          product: line.product,
          qtyOrdered: line.qtyOrdered,
          unitCost: line.unitCost,
          taxRate: line.taxRate,
          taxAmount: calculated.taxAmount,
          lineTotal: calculated.lineTotal,
          budgetId: line.budgetId || undefined,
          budget_line_id: line.budget_line_id || undefined,
          accountId: line.accountId || undefined,
        };
      });

      const payload = {
        supplier: formData.supplier,
        warehouse: formData.warehouse,
        orderDate: formData.orderDate,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
        currencyCode: formData.currencyCode,
        notes: formData.notes || undefined,
        lines: linesWithTotals,
      };

      let savedPoId: string | undefined;
      if (isEdit && id) {
        await purchaseOrdersApi.update(id, payload);
        savedPoId = id;
      } else {
        const createRes = await purchaseOrdersApi.create(payload);
        savedPoId = (createRes.data as any)?._id;
      }

      // If submit for approval, call the approve endpoint separately
      if (submitForApproval && savedPoId) {
        await purchaseOrdersApi.approve(savedPoId);
      }

      navigate('/purchase-orders');
    } catch (error) {
      console.error('Failed to save purchase order:', error);
    } finally {
      setSaving(false);
    }
  };

  const summary = calculateSummary();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: formData.currencyCode 
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
          <Button variant="ghost" onClick={() => navigate('/purchase-orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEdit 
              ? t('purchase.form.editTitle', 'Edit Purchase Order')
              : t('purchase.form.createTitle', 'Create Purchase Order')
            }
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Info */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('purchase.form.header', 'Order Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('purchase.form.supplier', 'Supplier')}</Label>
                    {suppliers.length > 0 ? (
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
                    ) : (
                      <Input disabled placeholder="Loading suppliers..." className="bg-white dark:bg-slate-700" />
                    )}
                  </div>
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('purchase.form.warehouse', 'Warehouse')}</Label>
                    {warehouses.length > 0 ? (
                      <Select 
                        value={formData.warehouse || undefined} 
                        onValueChange={(value) => setFormData({ ...formData, warehouse: value })}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                          <SelectValue placeholder={t('purchase.form.selectWarehouse', 'Select warehouse')} />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse._id} value={warehouse._id} className="dark:text-slate-200">
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input disabled placeholder="Loading warehouses..." className="bg-white dark:bg-slate-700" />
                    )}
                  </div>
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('purchase.form.orderDate', 'Order Date')}</Label>
                    <Input 
                      type="date" 
                      value={formData.orderDate}
                      onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
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
                    <Label className="text-slate-900 dark:text-white">{t('purchase.form.currency', 'Currency')}</Label>
                    <Select 
                      value={formData.currencyCode || 'FRW'} 
                      onValueChange={(value) => setFormData({ ...formData, currencyCode: value })}
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
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-white">{t('purchase.form.notes', 'Notes')}</Label>
                  <Textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('purchase.form.notesPlaceholder', 'Add any notes...')}
                    rows={3}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="dark:bg-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-slate-900 dark:text-white">{t('purchase.form.lines', 'Line Items')}</CardTitle>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('purchase.form.addLine', 'Add Line')}
                </Button>
              </CardHeader>
              <CardContent>
                {formData.lines.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                    <Calculator className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('purchase.form.noLines', 'No line items. Click "Add Line" to add products.')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700">
                        <TableHead className="dark:text-white">{t('purchase.form.product', 'Product')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.qty', 'Qty')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.unitCost', 'Unit Cost')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.taxRate', 'Tax %')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.tax', 'Tax')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.total', 'Total')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.budget', 'Budget')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.form.account', 'Account')}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                      <TableBody>
                      {formData.lines.map((line, index) => {
                        return (
                        <TableRow key={index}>
                          <TableCell className="min-w-[200px]">
                            <Select
                              value={line.product || 'none'}
                              onValueChange={(value) => value !== 'none' && handleProductSelect(index, value)}
                            >
                              <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                                <SelectValue placeholder={t('purchase.form.selectProduct', 'Select product...')} />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                <SelectItem value="none" className="dark:text-slate-200">{t('purchase.form.selectProduct', 'Select product...')}</SelectItem>
                                {products.map((product) => (
                                  <SelectItem key={product._id} value={product._id} className="dark:text-slate-200">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{product.name}</span>
                                      <span className="text-xs text-muted-foreground dark:text-slate-400">{product.sku}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              min="1"
                              className="w-20 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                              value={line.qtyOrdered}
                              onChange={(e) => handleLineChange(index, 'qtyOrdered', parseInt(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-24 bg-muted/50 dark:bg-slate-700/50"
                              value={line.unitCost}
                              readOnly
                              title={t('purchase.form.autoFilled', 'Auto-filled from product')}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              min="0"
                              max="100"
                              className="w-16 bg-muted/50 dark:bg-slate-700/50"
                              value={line.taxRate}
                              readOnly
                              title={t('purchase.form.autoFilled', 'Auto-filled from product')}
                            />
                          </TableCell>
                          <TableCell className="dark:text-slate-300">{formatCurrency(line.taxAmount)}</TableCell>
                          <TableCell className="font-medium dark:text-slate-200">{formatCurrency(line.lineTotal)}</TableCell>
                          <TableCell className="min-w-[140px]">
                            <Select
                              value={line.budgetId || 'none'}
                              onValueChange={(value) => handleLineChange(index, 'budgetId', value === 'none' ? '' : value)}
                            >
                              <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600 text-xs">
                                <SelectValue placeholder={t('purchase.form.selectBudget', 'Select budget...')} />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                <SelectItem value="none" className="dark:text-slate-200">{t('common.none', 'None')}</SelectItem>
                                {budgets.length === 0 && (
                                  <div className="px-2 py-1 text-xs text-muted-foreground dark:text-slate-400">
                                    {t('purchase.form.noBudgets', 'No approved budgets found')}
                                  </div>
                                )}
                                {budgets.map((budget) => (
                                  <SelectItem key={budget._id} value={budget._id} className="dark:text-slate-200">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{budget.name}</span>
                                      <span className="text-xs text-muted-foreground dark:text-slate-400">{budget.fiscalYear}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="min-w-[160px]">
                            <Select
                              value={line.accountId || 'none'}
                              onValueChange={(value) => handleLineChange(index, 'accountId', value === 'none' ? '' : value)}
                            >
                              <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600 text-xs">
                                <SelectValue placeholder={t('purchase.form.selectAccount', 'Select account...')} />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-h-[200px]">
                                <SelectItem value="none" className="dark:text-slate-200">{t('common.none', 'None')}</SelectItem>
                                {expenseAccounts.length === 0 && (
                                  <div className="px-2 py-1 text-xs text-muted-foreground dark:text-slate-400">
                                    {t('purchase.form.noAccounts', 'No expense accounts found')}
                                  </div>
                                )}
                                {expenseAccounts.map((account) => (
                                  <SelectItem key={account._id} value={account._id} className="dark:text-slate-200">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{account.code} - {account.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeLine(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        );
                      })}
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">{t('purchase.form.tax', 'Tax')}</span>
                  <span className="font-medium dark:text-slate-200">{formatCurrency(summary.tax)}</span>
                </div>
                <div className="border-t pt-4 flex justify-between dark:border-slate-600">
                  <span className="font-bold text-slate-900 dark:text-white">{t('purchase.form.total', 'Total')}</span>
                  <span className="font-bold text-lg text-slate-900 dark:text-white">{formatCurrency(summary.total)}</span>
                </div>

                <div className="space-y-2 pt-4">
                  <Button 
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {t('purchase.form.saveDraft', 'Save as Draft')}
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {t('purchase.form.submitApproval', 'Submit for Approval')}
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