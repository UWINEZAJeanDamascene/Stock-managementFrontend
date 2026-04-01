import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { purchaseOrdersApi, suppliersApi, warehousesApi, productsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  Save, 
  Send,
  Plus, 
  Trash2,
  Loader2,
  Calculator,
  X
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
  }, [fetchSuppliers, fetchWarehouses, fetchProducts]);

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

  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setFormData(prev => {
        const newLines = [...prev.lines];
        newLines[index] = { ...newLines[index], product: productId, productName: product.name };
        return { ...prev, lines: newLines };
      });
    }
    setSelectedProductIndex(null);
    setOpenDropdownIndex(null);
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
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/purchase-orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold">
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
            <Card>
              <CardHeader>
                <CardTitle>{t('purchase.form.header', 'Order Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('purchase.form.supplier', 'Supplier')}</Label>
                    {suppliers.length > 0 ? (
                      <Select 
                        value={formData.supplier || undefined} 
                        onValueChange={(value) => setFormData({ ...formData, supplier: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('purchase.form.selectSupplier', 'Select supplier')} />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier._id} value={supplier._id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input disabled placeholder="Loading suppliers..." />
                    )}
                  </div>
                  <div>
                    <Label>{t('purchase.form.warehouse', 'Warehouse')}</Label>
                    {warehouses.length > 0 ? (
                      <Select 
                        value={formData.warehouse || undefined} 
                        onValueChange={(value) => setFormData({ ...formData, warehouse: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('purchase.form.selectWarehouse', 'Select warehouse')} />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse._id} value={warehouse._id}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input disabled placeholder="Loading warehouses..." />
                    )}
                  </div>
                  <div>
                    <Label>{t('purchase.form.orderDate', 'Order Date')}</Label>
                    <Input 
                      type="date" 
                      value={formData.orderDate}
                      onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('purchase.form.expectedDelivery', 'Expected Delivery')}</Label>
                    <Input 
                      type="date" 
                      value={formData.expectedDeliveryDate}
                      onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('purchase.form.currency', 'Currency')}</Label>
                    <Select 
                      value={formData.currencyCode || 'FRW'} 
                      onValueChange={(value) => setFormData({ ...formData, currencyCode: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                {formData.lines.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('purchase.form.noLines', 'No line items. Click "Add Line" to add products.')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('purchase.form.product', 'Product')}</TableHead>
                        <TableHead>{t('purchase.form.qty', 'Qty')}</TableHead>
                        <TableHead>{t('purchase.form.unitCost', 'Unit Cost')}</TableHead>
                        <TableHead>{t('purchase.form.taxRate', 'Tax %')}</TableHead>
                        <TableHead>{t('purchase.form.tax', 'Tax')}</TableHead>
                        <TableHead>{t('purchase.form.total', 'Total')}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                      <TableBody>
                      {formData.lines.map((line, index) => {
                        const search = (line.productName || '').toLowerCase();
                        const filteredProducts = search
                          ? products.filter(p =>
                              p.name.toLowerCase().includes(search) ||
                              p.sku.toLowerCase().includes(search)
                            ).slice(0, 20)
                          : products.slice(0, 20);
                        const isOpen = openDropdownIndex === index;
                        return (
                        <TableRow key={index}>
                          <TableCell>
                            <div 
                              className="relative w-[220px]"
                              ref={(el) => { dropdownRefs.current[index] = el; }}
                            >
                              <input
                                type="text"
                                placeholder={t('purchase.form.selectProduct', 'Search product...')}
                                value={line.productName || ''}
                                onChange={(e) => {
                                  setFormData(prev => {
                                    const newLines = [...prev.lines];
                                    newLines[index] = { ...newLines[index], productName: e.target.value, product: '' };
                                    return { ...prev, lines: newLines };
                                  });
                                  setOpenDropdownIndex(index);
                                  setSelectedProductIndex(null);
                                }}
                                onFocus={() => setOpenDropdownIndex(index)}
                                onBlur={() => {
                                  setTimeout(() => setOpenDropdownIndex(null), 150);
                                }}
                                onKeyDown={(e) => {
                                  if (!isOpen) {
                                    setOpenDropdownIndex(index);
                                  }
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setSelectedProductIndex(prev =>
                                      prev === null ? 0 : Math.min(prev + 1, filteredProducts.length - 1)
                                    );
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setSelectedProductIndex(prev =>
                                      prev === null ? 0 : Math.max(prev - 1, 0)
                                    );
                                  } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (selectedProductIndex !== null && filteredProducts[selectedProductIndex]) {
                                      handleProductSelect(index, filteredProducts[selectedProductIndex]._id);
                                      setOpenDropdownIndex(null);
                                    }
                                  } else if (e.key === 'Escape') {
                                    setOpenDropdownIndex(null);
                                  }
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-8"
                              />
                              {line.productName && (
                                <button
                                  type="button"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setFormData(prev => {
                                      const newLines = [...prev.lines];
                                      newLines[index] = { ...newLines[index], productName: '', product: '' };
                                      return { ...prev, lines: newLines };
                                    });
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                              {isOpen && (
                                <div 
                                  className="absolute z-[100] mt-1 w-full max-h-[200px] overflow-y-auto rounded-md border bg-white shadow-lg"
                                >
                                  {filteredProducts.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">
                                      {t('purchase.form.noProductsFound', 'No products found')}
                                    </div>
                                  ) : (
                                    filteredProducts.map((product, pIdx) => (
                                      <div
                                        key={product._id}
                                        className={`px-3 py-2 text-sm cursor-pointer ${
                                          pIdx === selectedProductIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleProductSelect(index, product._id);
                                          setOpenDropdownIndex(null);
                                        }}
                                        onMouseEnter={() => setSelectedProductIndex(pIdx)}
                                      >
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-xs text-muted-foreground">{product.sku}</div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              min="1"
                              className="w-20"
                              value={line.qtyOrdered}
                              onChange={(e) => handleLineChange(index, 'qtyOrdered', parseInt(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-24"
                              value={line.unitCost}
                              onChange={(e) => handleLineChange(index, 'unitCost', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              min="0"
                              max="100"
                              className="w-16"
                              value={line.taxRate}
                              onChange={(e) => handleLineChange(index, 'taxRate', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>{formatCurrency(line.taxAmount)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(line.lineTotal)}</TableCell>
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
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>{t('purchase.form.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('purchase.form.subtotal', 'Subtotal')}</span>
                  <span className="font-medium">{formatCurrency(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('purchase.form.tax', 'Tax')}</span>
                  <span className="font-medium">{formatCurrency(summary.tax)}</span>
                </div>
                <div className="border-t pt-4 flex justify-between">
                  <span className="font-bold">{t('purchase.form.total', 'Total')}</span>
                  <span className="font-bold text-lg">{formatCurrency(summary.total)}</span>
                </div>

                <div className="space-y-2 pt-4">
                  <Button 
                    className="w-full"
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
                    className="w-full"
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