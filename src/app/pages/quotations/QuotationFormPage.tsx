import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { quotationsApi, clientsApi, productsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  Save, 
  Send,
  Loader2,
  Plus,
  Trash2
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
}

interface Client {
  _id: string;
  name: string;
  code?: string;
}

interface QuotationLine {
  _id?: string;
  product: string;
  productName?: string;
  productSku?: string;
  description: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  lineTotal: number;
}

interface QuotationFormData {
  client: string;
  quotationDate: string;
  expiryDate: string;
  currency: string;
  notes: string;
  lines: QuotationLine[];
}

const emptyLine: QuotationLine = {
  product: '',
  description: '',
  qty: 1,
  unitPrice: 0,
  discountPercent: 0,
  taxRate: 0,
  lineTotal: 0
};

export default function QuotationFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [formData, setFormData] = useState<QuotationFormData>({
    client: '',
    quotationDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'USD',
    notes: '',
    lines: [{ ...emptyLine }]
  });

  useEffect(() => {
    fetchClients();
    fetchProducts();
    if (isEditMode && id) {
      fetchQuotation(id);
    }
  }, [id, isEditMode]);

  const fetchClients = async () => {
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
  };

  const fetchProducts = async () => {
    try {
      const response = await productsApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        const productData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as unknown[]);
        setProducts(productData as Product[]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchQuotation = async (quotationId: string) => {
    setLoading(true);
    try {
      const response = await quotationsApi.getById(quotationId);
      if (response.success && response.data) {
        const quotation = response.data as any;
        setFormData({
          client: quotation.client?._id || '',
          quotationDate: quotation.quotationDate ? quotation.quotationDate.split('T')[0] : '',
          expiryDate: quotation.expiryDate ? quotation.expiryDate.split('T')[0] : '',
          currency: quotation.currency || 'USD',
          notes: quotation.notes || '',
          lines: quotation.lines && quotation.lines.length > 0 
            ? quotation.lines.map((line: any) => ({
                _id: line._id,
                product: line.product?._id || line.product || '',
                productName: line.product?.name,
                productSku: line.product?.sku,
                description: line.description || '',
                qty: line.qty || 1,
                unitPrice: line.unitPrice || 0,
                discountPercent: line.discountPercent || 0,
                taxRate: line.taxRate || 0,
                lineTotal: line.lineTotal || 0
              }))
            : [{ ...emptyLine }]
        });
      }
    } catch (error) {
      console.error('Failed to fetch quotation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLineChange = (index: number, field: keyof QuotationLine, value: any) => {
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
    const qty = field === 'qty' ? parseFloat(value) || 0 : line.qty;
    const unitPrice = field === 'unitPrice' ? parseFloat(value) || 0 : line.unitPrice;
    const discount = field === 'discountPercent' ? parseFloat(value) || 0 : line.discountPercent;
    const taxRate = field === 'taxRate' ? parseFloat(value) || 0 : line.taxRate;
    
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
    return formData.lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0);
  };

  const calculateDiscount = () => {
    return formData.lines.reduce((sum, line) => {
      const lineSubtotal = line.qty * line.unitPrice;
      return sum + (lineSubtotal * (line.discountPercent / 100));
    }, 0);
  };

  const calculateTax = () => {
    return formData.lines.reduce((sum, line) => {
      const lineSubtotal = line.qty * line.unitPrice;
      const discountAmount = lineSubtotal * (line.discountPercent / 100);
      const afterDiscount = lineSubtotal - discountAmount;
      return sum + (afterDiscount * (line.taxRate / 100));
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const tax = calculateTax();
    return subtotal - discount + tax;
  };

  const handleSave = async (sendImmediately: boolean = false) => {
    if (!formData.client || formData.lines.length === 0) {
      return;
    }

    setSaving(true);
    try {
      const quotationData = {
        client: formData.client,
        quotationDate: formData.quotationDate,
        expiryDate: formData.expiryDate,
        currency: formData.currency,
        notes: formData.notes,
        lines: formData.lines.map(line => ({
          product: line.product,
          description: line.description,
          qty: line.qty,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent,
          taxRate: line.taxRate
        }))
      };

      let response;
      if (isEditMode && id) {
        response = await quotationsApi.update(id, quotationData);
      } else {
        response = await quotationsApi.create(quotationData);
      }

      if (response.success && response.data) {
        const quotationId = (response.data as any)._id;
        if (sendImmediately && quotationId) {
          await quotationsApi.send(quotationId);
        }
        navigate('/quotations');
      }
    } catch (error) {
      console.error('Failed to save quotation:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(amount);
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
          <Button variant="ghost" onClick={() => navigate('/quotations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditMode ? t('quotation.editQuotation', 'Edit Quotation') : t('quotation.newQuotation', 'New Quotation')}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('quotation.basicInfo', 'Basic Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('quotation.client')} *</Label>
                    <Select value={formData.client} onValueChange={(value) => setFormData(prev => ({ ...prev, client: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('quotation.selectClient')} />
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
                    <Label>{t('quotation.currency')}</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="LBP">LBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('quotation.quotationDate')}</Label>
                    <Input 
                      type="date"
                      value={formData.quotationDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, quotationDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{t('quotation.expiryDate')}</Label>
                    <Input 
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>{t('quotation.lineItems', 'Line Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ width: 200 }}>{t('quotation.product', 'Product')}</TableHead>
                      <TableHead>{t('quotation.description', 'Description')}</TableHead>
                      <TableHead className="text-right">{t('quotation.qty', 'Qty')}</TableHead>
                      <TableHead className="text-right">{t('quotation.unitPrice', 'Unit Price')}</TableHead>
                      <TableHead className="text-right">{t('quotation.discount', 'Discount %')}</TableHead>
                      <TableHead className="text-right">{t('quotation.taxRate', 'Tax %')}</TableHead>
                      <TableHead className="text-right">{t('quotation.total', 'Total')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.lines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select value={line.product} onValueChange={(value) => handleLineChange(index, 'product', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('quotation.selectProduct')} />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(product => (
                                <SelectItem key={product._id} value={product._id}>
                                  {product.name} ({product.sku})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            value={line.description}
                            onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                            placeholder={t('quotation.descriptionOverride', 'Description override')}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number"
                            min="1"
                            value={line.qty}
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
                            value={line.discountPercent}
                            onChange={(e) => handleLineChange(index, 'discountPercent', e.target.value)}
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
                  {t('quotation.addLine', 'Add Line')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('quotation.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>{t('quotation.subtotal', 'Subtotal')}</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('quotation.discount', 'Discount')}</span>
                  <span>- {formatCurrency(calculateDiscount())}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('quotation.tax', 'Tax')}</span>
                  <span>{formatCurrency(calculateTax())}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                  <span>{t('quotation.total', 'Total')}</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('quotation.notes', 'Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('quotation.notesPlaceholder', 'Add notes...')}
                  rows={4}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => handleSave(false)}
                disabled={saving || !formData.client}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('quotation.saveDraft', 'Save Draft')}
              </Button>
              <Button 
                variant="default"
                onClick={() => handleSave(true)}
                disabled={saving || !formData.client}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {t('quotation.sendToClient', 'Save & Send')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}