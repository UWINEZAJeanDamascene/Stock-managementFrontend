import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { invoicesApi, clientsApi, productsApi, warehousesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Plus, 
  Trash2,
  CheckCircle
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/app/components/ui/table';
import { useTranslation } from 'react-i18next';

interface Product {
  _id: string;
  name: string;
  sku: string;
  sellingPrice?: number;
  currentStock?: number;
}

interface Client {
  _id: string;
  name: string;
  code?: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code?: string;
}

interface InvoiceLine {
  _id?: string;
  product: string;
  productName?: string;
  productSku?: string;
  description: string;
  qty: number;
  quantity?: number;
  unitPrice: number;
  discountPct: number;
  discount?: number;
  taxRate: number;
  lineTotal: number;
  warehouse?: string;
}

interface InvoiceFormData {
  client: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  currencyCode: string;
  notes: string;
  lines: InvoiceLine[];
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'RWF', 'KES', 'UGX', 'TZS'];

const emptyLine: InvoiceLine = {
  product: '',
  description: '',
  qty: 1,
  quantity: 1,
  unitPrice: 0,
  discountPct: 0,
  discount: 0,
  taxRate: 0,
  lineTotal: 0,
  warehouse: ''
};

export default function InvoiceFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [formData, setFormData] = useState<InvoiceFormData>({
    client: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: 'net30',
    currencyCode: 'USD',
    notes: '',
    lines: [{ ...emptyLine }]
  });

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientsApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        const clientData = Array.isArray(response.data)
          ? response.data
          : (response.data as unknown[]);
        setClients(clientData as Client[]);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await productsApi.getAll({ limit: 500 });
      if (response.success && response.data) {
        const productData = Array.isArray(response.data)
          ? response.data
          : (response.data as unknown[]);
        setProducts(productData as Product[]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await warehousesApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        const warehouseData = Array.isArray(response.data)
          ? response.data
          : (response.data as unknown[]);
        setWarehouses(warehouseData as Warehouse[]);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  }, []);

  const fetchInvoice = useCallback(async (invoiceId: string) => {
    setLoading(true);
    try {
      const response = await invoicesApi.getById(invoiceId);
      if (response.success && response.data) {
        const invoice = response.data as any;
        setFormData({
          client: invoice.client?._id || '',
          invoiceDate: invoice.invoiceDate ? invoice.invoiceDate.split('T')[0] : '',
          dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
          paymentTerms: invoice.paymentTerms || 'net30',
          currencyCode: invoice.currencyCode || 'USD',
          notes: invoice.notes || '',
          lines: invoice.lines && invoice.lines.length > 0
            ? invoice.lines.map((line: any) => ({
                _id: line._id,
                product: line.product?._id || line.product || '',
                productName: line.product?.name,
                productSku: line.product?.sku,
                description: line.description || '',
                qty: line.qty || line.quantity || 1,
                quantity: line.quantity || line.qty || 1,
                unitPrice: line.unitPrice || 0,
                discountPct: line.discountPct || line.discountPercent || 0,
                discount: line.discount || 0,
                taxRate: line.taxRate || 0,
                lineTotal: line.lineTotal || 0,
                warehouse: line.warehouse?._id || line.warehouse || ''
              }))
            : [{ ...emptyLine }]
        });
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchProducts();
    fetchWarehouses();
  }, [fetchClients, fetchProducts, fetchWarehouses]);

  useEffect(() => {
    if (isEditMode && id) {
      fetchInvoice(id);
    }
  }, [id, isEditMode, fetchInvoice]);

  const handleLineChange = (index: number, field: keyof InvoiceLine, value: any) => {
    const newLines = [...formData.lines];
    const line = { ...newLines[index] };

    if (field === 'product' && value) {
      const product = products.find(p => p._id === value);
      if (product) {
        line.product = value;
        line.productName = product.name;
        line.productSku = product.sku;
        line.unitPrice = product.sellingPrice || 0;
      }
    } else {
      (line as any)[field] = value;
    }

    // Calculate line total
    const qty = field === 'qty' || field === 'quantity' ? parseFloat(value) || 0 : line.qty || line.quantity || 0;
    const unitPrice = field === 'unitPrice' ? parseFloat(value) || 0 : line.unitPrice || 0;
    const discount = field === 'discountPct' ? parseFloat(value) || 0 : line.discountPct || 0;
    const taxRate = field === 'taxRate' ? parseFloat(value) || 0 : line.taxRate || 0;

    const subtotal = qty * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxRate / 100);
    line.lineTotal = afterDiscount + taxAmount;

    newLines[index] = line;
    setFormData(prev => ({ ...prev, lines: newLines }));
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { ...emptyLine }]
    }));
  };

  const removeLine = (index: number) => {
    if (formData.lines.length > 1) {
      const newLines = formData.lines.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, lines: newLines }));
    }
  };

  const calculateSubtotal = () => {
    return formData.lines.reduce((sum, line) => sum + ((line.qty || line.quantity || 0) * line.unitPrice), 0);
  };

  const calculateDiscount = () => {
    return formData.lines.reduce((sum, line) => {
      const lineSubtotal = (line.qty || line.quantity || 0) * line.unitPrice;
      return sum + (lineSubtotal * ((line.discountPct || line.discount || 0) / 100));
    }, 0);
  };

  const calculateTax = () => {
    return formData.lines.reduce((sum, line) => {
      const lineSubtotal = (line.qty || line.quantity || 0) * line.unitPrice;
      const discountAmount = lineSubtotal * ((line.discountPct || line.discount || 0) / 100);
      const afterDiscount = lineSubtotal - discountAmount;
      return sum + (afterDiscount * ((line.taxRate || 0) / 100));
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const tax = calculateTax();
    return subtotal - discount + tax;
  };

  const handleSave = async (confirmImmediately: boolean = false) => {
    if (!formData.client || formData.lines.length === 0) {
      alert(t('invoice.selectClient', 'Please select a client'));
      return;
    }

    // Validate all lines have products
    const hasInvalidLines = formData.lines.some(line => !line.product);
    if (hasInvalidLines) {
      alert(t('invoice.selectProducts', 'Please select products for all lines'));
      return;
    }

    setSaving(true);
    try {
      const invoiceData = {
        client: formData.client,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        paymentTerms: formData.paymentTerms,
        currencyCode: formData.currencyCode,
        notes: formData.notes,
        lines: formData.lines.map(line => ({
          product: line.product,
          description: line.description,
          qty: line.qty || line.quantity,
          quantity: line.quantity || line.qty,
          unitPrice: line.unitPrice,
          discountPct: line.discountPct,
          discount: line.discount,
          taxRate: line.taxRate,
          warehouse: line.warehouse
        })),
        autoConfirm: confirmImmediately
      };

      let response;
      if (isEditMode && id) {
        response = await invoicesApi.update(id, invoiceData);
      } else {
        response = await invoicesApi.create(invoiceData);
      }

      if (response.success && response.data) {
        const invoiceId = (response.data as any)._id;
        if (confirmImmediately && invoiceId) {
          await invoicesApi.confirm(invoiceId);
        }
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Failed to save invoice:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currencyCode }).format(amount);
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
          <Button variant="ghost" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditMode ? t('invoice.editInvoice', 'Edit Invoice') : t('invoice.newInvoice', 'New Invoice')}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('invoice.basicInfo', 'Basic Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('invoice.client')} *</Label>
                    <Select value={formData.client} onValueChange={(value) => setFormData(prev => ({ ...prev, client: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('invoice.selectClient')} />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client._id} value={client._id}>
                            {client.name} ({client.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('invoice.currency')}</Label>
                    <Select value={formData.currencyCode} onValueChange={(value) => setFormData(prev => ({ ...prev, currencyCode: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(curr => (
                          <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>{t('invoice.invoiceDate')}</Label>
                    <Input
                      type="date"
                      value={formData.invoiceDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{t('invoice.dueDate')}</Label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{t('invoice.paymentTerms')}</Label>
                    <Select value={formData.paymentTerms} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentTerms: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="due_on_receipt">{t('invoice.terms.due_on_receipt', 'Due on Receipt')}</SelectItem>
                        <SelectItem value="net7">{t('invoice.terms.net7', 'Net 7')}</SelectItem>
                        <SelectItem value="net15">{t('invoice.terms.net15', 'Net 15')}</SelectItem>
                        <SelectItem value="net30">{t('invoice.terms.net30', 'Net 30')}</SelectItem>
                        <SelectItem value="net45">{t('invoice.terms.net45', 'Net 45')}</SelectItem>
                        <SelectItem value="net60">{t('invoice.terms.net60', 'Net 60')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>{t('invoice.lineItems', 'Line Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ width: 200 }}>{t('invoice.product', 'Product')}</TableHead>
                      <TableHead>{t('invoice.description', 'Description')}</TableHead>
                      <TableHead>{t('invoice.warehouse', 'Warehouse')}</TableHead>
                      <TableHead className="text-right">{t('invoice.qty', 'Qty')}</TableHead>
                      <TableHead className="text-right">{t('invoice.unitPrice', 'Unit Price')}</TableHead>
                      <TableHead className="text-right">{t('invoice.discount', 'Discount %')}</TableHead>
                      <TableHead className="text-right">{t('invoice.taxRate', 'Tax %')}</TableHead>
                      <TableHead className="text-right">{t('invoice.total', 'Total')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.lines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select value={line.product} onValueChange={(value) => handleLineChange(index, 'product', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('invoice.selectProduct')} />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(product => (
                                <SelectItem key={product._id} value={product._id}>
                                  {product.name} ({product.sku}) - Stock: {product.currentStock || 0}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.description}
                            onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                            placeholder={t('invoice.descriptionOverride', 'Description override')}
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={line.warehouse || ''} onValueChange={(value) => handleLineChange(index, 'warehouse', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('invoice.selectWarehouse')} />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses.map(warehouse => (
                                <SelectItem key={warehouse._id} value={warehouse._id}>
                                  {warehouse.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={line.qty || line.quantity}
                            onChange={(e) => handleLineChange(index, 'qty', e.target.value)}
                            className="w-20 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => handleLineChange(index, 'unitPrice', e.target.value)}
                            className="w-24 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={line.discountPct}
                            onChange={(e) => handleLineChange(index, 'discountPct', e.target.value)}
                            className="w-16 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={line.taxRate}
                            onChange={(e) => handleLineChange(index, 'taxRate', e.target.value)}
                            className="w-16 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(line.lineTotal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(index)}
                            disabled={formData.lines.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button variant="outline" onClick={addLine} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('invoice.addLine', 'Add Line')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('invoice.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>{t('invoice.subtotal', 'Subtotal')}</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('invoice.discount', 'Discount')}</span>
                  <span>- {formatCurrency(calculateDiscount())}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('invoice.tax', 'Tax')}</span>
                  <span>{formatCurrency(calculateTax())}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                  <span>{t('invoice.total', 'Total')}</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('invoice.notes', 'Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('invoice.notesPlaceholder', 'Add notes...')}
                  rows={4}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => handleSave(false)}
                disabled={saving || !formData.client}
                variant="outline"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('invoice.saveDraft', 'Save as Draft')}
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving || !formData.client}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {t('invoice.confirmAndPost', 'Confirm & Post')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}