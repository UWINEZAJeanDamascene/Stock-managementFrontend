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
  Trash2,
  XCircle,
  CheckCircle,
  Pencil,
  ArrowRight
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
  const searchParams = new URLSearchParams(window.location.search);
  const isViewMode = searchParams.get('view') === 'true';
  const isEditMode = Boolean(id) && !isViewMode;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quotation, setQuotation] = useState<any>(null);

  useEffect(() => {
    console.log('[QuotationFormPage] Quotation loaded:', quotation);
    console.log('[QuotationFormPage] Rejection fields:', {
      status: quotation?.status,
      rejectionReason: quotation?.rejectionReason,
      clientRejectionReason: quotation?.clientRejectionReason,
      rejectionDate: quotation?.rejectionDate,
    });
  }, [quotation]);
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
    if ((isEditMode || isViewMode) && id) {
      fetchQuotation(id);
    }
  }, [id, isEditMode, isViewMode]);

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
        setQuotation(quotation);
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
        // Reset to draft if the original status was rejected (backend only allows editing draft)
        status: quotation?.status === 'rejected' ? 'draft' : undefined,
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

  const handleConvert = async (quotationId: string) => {
    try {
      const response = await quotationsApi.convertToInvoice(quotationId, {});
      if (response.success) {
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Failed to convert quotation:', error);
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
          <Button variant="ghost" onClick={() => navigate('/quotations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isViewMode ? t('quotation.quotationDetails', 'Quotation Details') : isEditMode ? t('quotation.editQuotation', 'Edit Quotation') : t('quotation.newQuotation', 'New Quotation')}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Response / Rejection Alert */}
          {isViewMode && (quotation?.status === 'rejected' || quotation?.rejectionReason) && (
            <div className="lg:col-span-3">
              <Card className="border-l-4 border-l-red-500 bg-red-50/80 dark:bg-red-900/20 shadow-sm">
                <CardContent className="py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-red-900 dark:text-red-400">Quotation Rejected by Client</h3>
                      {quotation?.rejectionDate && (
                        <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-0.5">
                          Rejected on {new Date(quotation.rejectionDate).toLocaleDateString()} at {new Date(quotation.rejectionDate).toLocaleTimeString()}
                        </p>
                      )}
                      {quotation?.rejectionReason ? (
                        <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-md border border-red-200 dark:border-red-800 shadow-sm">
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">Client's Reason</p>
                          <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed">{quotation.rejectionReason}</p>
                        </div>
                      ) : (
                        <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-md border border-red-200 dark:border-red-800 shadow-sm">
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">Client's Reason</p>
                          <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed">No reason provided</p>
                        </div>
                      )}
                      <div className="mt-4">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/quotations/${id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit & Resend
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {isViewMode && quotation?.status === 'accepted' && (
            <div className="lg:col-span-3">
              <Card className="border-l-4 border-l-green-500 bg-green-50/80 dark:bg-green-900/20 shadow-sm">
                <CardContent className="py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-green-900 dark:text-green-400">Quotation Accepted by Client</h3>
                      {quotation?.acceptedDate && (
                        <p className="text-sm text-green-700/80 dark:text-green-400/80 mt-0.5">
                          Accepted on {new Date(quotation.acceptedDate).toLocaleDateString()} at {new Date(quotation.acceptedDate).toLocaleTimeString()}
                        </p>
                      )}
                      {!quotation?.convertedToInvoice && (
                        <div className="mt-4">
                          <Button size="sm" onClick={() => handleConvert(id!)} className="bg-green-600 hover:bg-green-700">
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Convert to Invoice
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('quotation.basicInfo', 'Basic Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('quotation.client')} *</Label>
                    {isViewMode ? (
                      <div className="mt-2 p-2 bg-muted dark:bg-slate-700 rounded dark:text-slate-200">
                        {clients.find(c => c._id === formData.client)?.name || formData.client}
                      </div>
                    ) : (
                      <Select value={formData.client} onValueChange={(value) => setFormData(prev => ({ ...prev, client: value }))}>
                        <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                          <SelectValue placeholder={t('quotation.selectClient')} />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          {clients.map(client => (
                            <SelectItem key={client._id} value={client._id} className="dark:text-slate-200">
                              {client.name} ({client.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('quotation.currency')}</Label>
                    {isViewMode ? (
                      <div className="mt-2 p-2 bg-muted dark:bg-slate-700 rounded dark:text-slate-200">{formData.currency}</div>
                    ) : (
                      <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                        <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <SelectItem value="USD" className="dark:text-slate-200">USD</SelectItem>
                          <SelectItem value="EUR" className="dark:text-slate-200">EUR</SelectItem>
                          <SelectItem value="GBP" className="dark:text-slate-200">GBP</SelectItem>
                          <SelectItem value="LBP" className="dark:text-slate-200">LBP</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('quotation.quotationDate')}</Label>
                    {isViewMode ? (
                      <div className="mt-2 p-2 bg-muted dark:bg-slate-700 rounded dark:text-slate-200">{formData.quotationDate}</div>
                    ) : (
                      <Input 
                        type="date"
                        value={formData.quotationDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, quotationDate: e.target.value }))}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('quotation.expiryDate')}</Label>
                    {isViewMode ? (
                      <div className="mt-2 p-2 bg-muted dark:bg-slate-700 rounded dark:text-slate-200">{formData.expiryDate}</div>
                    ) : (
                      <Input 
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                        className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('quotation.lineItems', 'Line Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700">
                      <TableHead style={{ width: 200 }} className="dark:text-white">{t('quotation.product', 'Product')}</TableHead>
                      <TableHead className="dark:text-white">{t('quotation.description', 'Description')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('quotation.qty', 'Qty')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('quotation.unitPrice', 'Unit Price')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('quotation.discount', 'Discount %')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('quotation.taxRate', 'Tax %')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('quotation.total', 'Total')}</TableHead>
                      {!isViewMode && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.lines.map((line, index) => (
                      <TableRow key={index} className="dark:hover:bg-slate-700/50">
                        <TableCell>
                          {isViewMode ? (
                            <div className="dark:text-slate-200">{line.productName || products.find(p => p._id === line.product)?.name}</div>
                          ) : (
                            <Select value={line.product} onValueChange={(value) => handleLineChange(index, 'product', value)}>
                              <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                                <SelectValue placeholder={t('quotation.selectProduct')} />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                {products.map(product => (
                                  <SelectItem key={product._id} value={product._id} className="dark:text-slate-200">
                                    {product.name} ({product.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {isViewMode ? (
                            <div className="dark:text-slate-300">{line.description}</div>
                          ) : (
                            <Input 
                              value={line.description}
                              onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                              placeholder={t('quotation.descriptionOverride', 'Description override')}
                              className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right dark:text-slate-300">
                          {isViewMode ? line.qty : (
                            <Input 
                              type="number"
                              min="1"
                              value={line.qty}
                              onChange={(e) => handleLineChange(index, 'qty', e.target.value)}
                              className="w-20 text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right dark:text-slate-300">
                          {isViewMode ? formatCurrency(line.unitPrice) : (
                            <Input 
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => handleLineChange(index, 'unitPrice', e.target.value)}
                              className="w-24 text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right dark:text-slate-300">
                          {isViewMode ? line.discountPercent : (
                            <Input 
                              type="number"
                              min="0"
                              max="100"
                              value={line.discountPercent}
                              onChange={(e) => handleLineChange(index, 'discountPercent', e.target.value)}
                              className="w-16 text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right dark:text-slate-300">
                          {isViewMode ? line.taxRate : (
                            <Input 
                              type="number"
                              min="0"
                              max="100"
                              value={line.taxRate}
                              onChange={(e) => handleLineChange(index, 'taxRate', e.target.value)}
                              className="w-16 text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium dark:text-slate-200">
                          {formatCurrency(line.lineTotal)}
                        </TableCell>
                        {!isViewMode && (
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
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!isViewMode && (
                  <Button variant="outline" onClick={addLine} className="mt-4 dark:border-slate-600 dark:text-slate-200">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('quotation.addLine', 'Add Line')}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('quotation.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between dark:text-slate-300">
                  <span>{t('quotation.subtotal', 'Subtotal')}</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between dark:text-slate-300">
                  <span>{t('quotation.discount', 'Discount')}</span>
                  <span>- {formatCurrency(calculateDiscount())}</span>
                </div>
                <div className="flex justify-between dark:text-slate-300">
                  <span>{t('quotation.tax', 'Tax')}</span>
                  <span>{formatCurrency(calculateTax())}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t dark:border-slate-600">
                  <span className="text-slate-900 dark:text-white">{t('quotation.total', 'Total')}</span>
                  <span className="text-slate-900 dark:text-white">{formatCurrency(calculateTotal())}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('quotation.notes', 'Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('quotation.notesPlaceholder', 'Add notes...')}
                  rows={4}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              {!isViewMode && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}