import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { purchasesApi, suppliersApi, productsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Loader2,
  Calculator,
  X,
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

interface Product {
  _id: string;
  name: string;
  sku: string;
  unit?: string;
  taxRate?: number;
  taxCode?: string;
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [formData, setFormData] = useState<PurchaseFormData>({
    supplier: '',
    currency: 'FRW',
    paymentTerms: 'cash',
    purchaseDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    supplierInvoiceNumber: '',
    supplierInvoiceDate: '',
    notes: '',
    items: [],
  });

  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
          })) || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch purchase:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, [fetchSuppliers, fetchProducts]);

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
        newLines[index] = {
          ...newLines[index],
          product: productId,
          productName: product.name,
          productSku: product.sku,
          taxRate: product.taxRate || 0,
          taxCode: product.taxCode || 'A',
        };
        const calculated = calculateLineTotals(newLines[index]);
        newLines[index].subtotal = calculated.subtotal;
        newLines[index].taxAmount = calculated.taxAmount;
        newLines[index].totalWithTax = calculated.totalWithTax;
        return { ...prev, items: newLines };
      });
    }
    setSelectedProductIndex(null);
    setOpenDropdownIndex(null);
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
        items: validLines.map((line) => ({
          product: line.product,
          quantity: line.quantity,
          unitCost: line.unitCost,
          discount: line.discount,
          taxCode: line.taxCode,
          taxRate: line.taxRate,
        })),
      };

      if (isEdit && id) {
        await purchasesApi.update(id, payload);
      } else {
        await purchasesApi.create(payload);
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
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/purchases')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdit
              ? t('purchase.form.editTitle', 'Edit Purchase')
              : t('purchase.form.createTitle', 'New Purchase')}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t('purchase.form.header', 'Purchase Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('purchase.form.supplier', 'Supplier')} *</Label>
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
                  </div>
                  <div>
                    <Label>{t('purchase.form.currency', 'Currency')}</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData({ ...formData, currency: value })}
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
                  <div>
                    <Label>{t('purchase.form.purchaseDate', 'Purchase Date')}</Label>
                    <Input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
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
                    <Label>{t('purchase.form.paymentTerms', 'Payment Terms')}</Label>
                    <Select
                      value={formData.paymentTerms}
                      onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS.map((term) => (
                          <SelectItem key={term.value} value={term.value}>
                            {term.label}
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
                        <TableHead>{t('purchase.form.discount', 'Discount')}</TableHead>
                        <TableHead>{t('purchase.form.taxRate', 'Tax %')}</TableHead>
                        <TableHead>{t('purchase.form.tax', 'Tax')}</TableHead>
                        <TableHead>{t('purchase.form.total', 'Total')}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.items.map((line, index) => {
                        const search = (line.productName || '').toLowerCase();
                        const filteredProducts = search
                          ? products
                              .filter(
                                (p) =>
                                  p.name.toLowerCase().includes(search) ||
                                  p.sku.toLowerCase().includes(search)
                              )
                              .slice(0, 20)
                          : products.slice(0, 20);
                        const isOpen = openDropdownIndex === index;
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <div
                                className="relative w-[220px]"
                                ref={(el) => {
                                  dropdownRefs.current[index] = el;
                                }}
                              >
                                <input
                                  type="text"
                                  placeholder={t('purchase.form.selectProduct', 'Search product...')}
                                  value={line.productName || ''}
                                  onChange={(e) => {
                                    setFormData((prev) => {
                                      const newLines = [...prev.items];
                                      newLines[index] = {
                                        ...newLines[index],
                                        productName: e.target.value,
                                        product: '',
                                      };
                                      return { ...prev, items: newLines };
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
                                      setSelectedProductIndex((prev) =>
                                        prev === null ? 0 : Math.min(prev + 1, filteredProducts.length - 1)
                                      );
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      setSelectedProductIndex((prev) =>
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
                                      setFormData((prev) => {
                                        const newLines = [...prev.items];
                                        newLines[index] = {
                                          ...newLines[index],
                                          productName: '',
                                          product: '',
                                        };
                                        return { ...prev, items: newLines };
                                      });
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                                {isOpen && (
                                  <div className="absolute z-[100] mt-1 w-full max-h-[200px] overflow-y-auto rounded-md border bg-white shadow-lg">
                                    {filteredProducts.length === 0 ? (
                                      <div className="px-3 py-2 text-sm text-muted-foreground">
                                        {t('purchase.form.noProductsFound', 'No products found')}
                                      </div>
                                    ) : (
                                      filteredProducts.map((product, pIdx) => (
                                        <div
                                          key={product._id}
                                          className={`px-3 py-2 text-sm cursor-pointer ${
                                            pIdx === selectedProductIndex
                                              ? 'bg-accent text-accent-foreground'
                                              : 'hover:bg-accent hover:text-accent-foreground'
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
                                min="0.0001"
                                step="any"
                                className="w-20"
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
                                className="w-24"
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
                                className="w-20"
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
                                className="w-16"
                                value={line.taxRate}
                                onChange={(e) =>
                                  handleLineChange(index, 'taxRate', parseFloat(e.target.value) || 0)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(line.taxAmount)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(line.totalWithTax)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => removeLine(index)}>
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
                {summary.totalDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('purchase.form.discount', 'Discount')}</span>
                    <span className="font-medium">-{formatCurrency(summary.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('purchase.form.tax', 'Tax')}</span>
                  <span className="font-medium">{formatCurrency(summary.totalTax)}</span>
                </div>
                <div className="border-t pt-4 flex justify-between">
                  <span className="font-bold">{t('purchase.form.total', 'Total')}</span>
                  <span className="font-bold text-lg">{formatCurrency(summary.grandTotal)}</span>
                </div>

                <div className="space-y-2 pt-4">
                  <Button className="w-full" onClick={handleSave} disabled={saving}>
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
