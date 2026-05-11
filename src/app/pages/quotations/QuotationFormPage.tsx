import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { quotationsApi, clientsApi, productsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { useCurrency } from '@/contexts/CurrencyContext';
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
  ArrowRight,
  Receipt,
  Package,
  Calculator,
  CalendarDays,
  DollarSign,
  Users,
  FileText,
  PenLine,
  BadgeCheck,
  Ban,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Badge } from '@/app/components/ui/badge';
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
  TableRow,
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
  const { formatCurrency } = useCurrency();
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
    currency: 'RWF',
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
          currency: quotation.currency || 'RWF',
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
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] space-y-6">
            <Skeleton className="h-28 w-full rounded-xl" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  const pageTitle = isViewMode
    ? t('quotation.quotationDetails', 'Quotation Details')
    : isEditMode
      ? t('quotation.editQuotation', 'Edit Quotation')
      : t('quotation.newQuotation', 'New Quotation');

  const statusBadge = isViewMode && quotation?.status ? (
    <Badge variant="outline" className="capitalize dark:border-slate-700 dark:text-slate-300">
      {quotation.status}
    </Badge>
  ) : null;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                    {isViewMode ? <FileText className="h-5 w-5" /> : isEditMode ? <PenLine className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{pageTitle}</h1>
                  {statusBadge}
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {isViewMode ? t('quotation.viewDescription', 'Review quotation details, line items, and summary.') : t('quotation.createDescription', 'Fill in client, line items, and terms to build a quotation.')}
                </p>
                {isViewMode && quotation && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                      <CalendarDays className="mr-1 h-3 w-3" />
                      {quotation.quotationDate ? new Date(quotation.quotationDate).toLocaleDateString() : '—'}
                    </Badge>
                    <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                      <DollarSign className="mr-1 h-3 w-3" />
                      {quotation.currency || 'RWF'}
                    </Badge>
                    <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                      <Users className="mr-1 h-3 w-3" />
                      {clients.find((c) => c._id === formData.client)?.name || formData.client}
                    </Badge>
                  </div>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('/quotations')} className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200">
                    <ArrowLeft className="h-4 w-4" />
                    {t('common.back', 'Back')}
                  </Button>
                  {isViewMode && quotation?.status === 'rejected' && (
                    <Button size="sm" onClick={() => navigate(`/quotations/${id}/edit`)} className="h-10 gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                      <PenLine className="h-4 w-4" />
                      {t('quotation.editAndResend', 'Edit & Resend')}
                    </Button>
                  )}
                  {isViewMode && quotation?.status === 'accepted' && !quotation?.convertedToInvoice && (
                    <Button size="sm" onClick={() => handleConvert(id!)} className="h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500">
                      <ArrowRight className="h-4 w-4" />
                      {t('quotation.convertToInvoice', 'Convert to Invoice')}
                    </Button>
                  )}
                  {!isViewMode && (
                    <>
                      <Button onClick={() => handleSave(false)} disabled={saving || !formData.client} className="h-10 gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {t('quotation.saveDraft', 'Save Draft')}
                      </Button>
                      <Button variant="default" onClick={() => handleSave(true)} disabled={saving || !formData.client} className="h-10 gap-2">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {t('quotation.sendToClient', 'Save & Send')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {/* Summary mini grid */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Subtotal</p>
                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{formatCurrency(calculateSubtotal())}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Discount</p>
                  <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">- {formatCurrency(calculateDiscount())}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tax</p>
                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{formatCurrency(calculateTax())}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(calculateTotal())}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Alerts */}
          {isViewMode && (quotation?.status === 'rejected' || quotation?.rejectionReason) && (
            <Card className="overflow-hidden border-l-4 border-l-red-500 bg-red-50/80 shadow-sm dark:border-l-red-500 dark:bg-red-950/20">
              <CardContent className="py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                    <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-red-900 dark:text-red-400">Quotation Rejected by Client</h3>
                    {quotation?.rejectionDate && (
                      <p className="mt-0.5 text-sm text-red-700/80 dark:text-red-400/80">
                        Rejected on {new Date(quotation.rejectionDate).toLocaleDateString()} at {new Date(quotation.rejectionDate).toLocaleTimeString()}
                      </p>
                    )}
                    {quotation?.rejectionReason ? (
                      <div className="mt-3 rounded-md border border-red-200 bg-white p-3 shadow-sm dark:border-red-800 dark:bg-slate-900">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">Client&apos;s Reason</p>
                        <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">{quotation.rejectionReason}</p>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-md border border-red-200 bg-white p-3 shadow-sm dark:border-red-800 dark:bg-slate-900">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">Client&apos;s Reason</p>
                        <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">No reason provided</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {isViewMode && quotation?.status === 'accepted' && (
            <Card className="overflow-hidden border-l-4 border-l-emerald-500 bg-emerald-50/80 shadow-sm dark:border-l-emerald-500 dark:bg-emerald-950/20">
              <CardContent className="py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                    <BadgeCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-emerald-900 dark:text-emerald-400">Quotation Accepted by Client</h3>
                    {quotation?.acceptedDate && (
                      <p className="mt-0.5 text-sm text-emerald-700/80 dark:text-emerald-400/80">
                        Accepted on {new Date(quotation.acceptedDate).toLocaleDateString()} at {new Date(quotation.acceptedDate).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
            {/* Main Content */}
            <div className="space-y-6">
              {/* Basic Information */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                      <Users className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">{t('quotation.basicInfo', 'Basic Information')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('quotation.client')} *</Label>
                      {isViewMode ? (
                        <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          {clients.find((c) => c._id === formData.client)?.name || formData.client}
                        </div>
                      ) : (
                        <Select value={formData.client} onValueChange={(value) => setFormData((prev) => ({ ...prev, client: value }))}>
                          <SelectTrigger className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                            <SelectValue placeholder={t('quotation.selectClient')} />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                            {clients.map((client) => (
                              <SelectItem key={client._id} value={client._id} className="dark:focus:bg-slate-800 dark:focus:text-white">
                                {client.name} {client.code ? `(${client.code})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('quotation.currency')}</Label>
                      {isViewMode ? (
                        <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{formData.currency}</div>
                      ) : (
                        <Select value={formData.currency} onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}>
                          <SelectTrigger className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                            <SelectItem value="RWF" className="dark:focus:bg-slate-800 dark:focus:text-white">RWF (FRw)</SelectItem>
                            <SelectItem value="USD" className="dark:focus:bg-slate-800 dark:focus:text-white">USD ($)</SelectItem>
                            <SelectItem value="EUR" className="dark:focus:bg-slate-800 dark:focus:text-white">EUR (€)</SelectItem>
                            <SelectItem value="GBP" className="dark:focus:bg-slate-800 dark:focus:text-white">GBP (£)</SelectItem>
                            <SelectItem value="LBP" className="dark:focus:bg-slate-800 dark:focus:text-white">LBP (ل.ل)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('quotation.quotationDate')}</Label>
                      {isViewMode ? (
                        <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{formData.quotationDate}</div>
                      ) : (
                        <Input
                          type="date"
                          value={formData.quotationDate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, quotationDate: e.target.value }))}
                          className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                        />
                      )}
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('quotation.expiryDate')}</Label>
                      {isViewMode ? (
                        <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{formData.expiryDate}</div>
                      ) : (
                        <Input
                          type="date"
                          value={formData.expiryDate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                          className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                      <FileText className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">{t('quotation.notes', 'Notes')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('quotation.notesPlaceholder', 'Add notes...')}
                    rows={4}
                    className="bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                  />
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                      <Package className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">{t('quotation.lineItems', 'Line Items')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                          <TableHead className="text-slate-600 dark:text-slate-400">{t('quotation.product', 'Product')}</TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-400">{t('quotation.description', 'Description')}</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-slate-400">{t('quotation.qty', 'Qty')}</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-slate-400">{t('quotation.unitPrice', 'Unit Price')}</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-slate-400">{t('quotation.discount', 'Disc %')}</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-slate-400">{t('quotation.taxRate', 'Tax %')}</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-slate-400">{t('quotation.total', 'Total')}</TableHead>
                          {!isViewMode && <TableHead className="w-10" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.lines.map((line, index) => (
                          <TableRow key={index} className="group transition-colors hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/30">
                            <TableCell className="min-w-[180px]">
                              {isViewMode ? (
                                <span className="text-sm font-medium text-slate-950 dark:text-white">{line.productName || products.find((p) => p._id === line.product)?.name || '—'}</span>
                              ) : (
                                <Select value={line.product} onValueChange={(value) => handleLineChange(index, 'product', value)}>
                                  <SelectTrigger className="h-9 bg-white text-sm text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                                    <SelectValue placeholder={t('quotation.selectProduct')} />
                                  </SelectTrigger>
                                  <SelectContent className="dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                                    {products.map((product) => (
                                      <SelectItem key={product._id} value={product._id} className="dark:focus:bg-slate-800 dark:focus:text-white">
                                        {product.name} ({product.sku})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell className="min-w-[200px]">
                              {isViewMode ? (
                                <span className="text-sm text-slate-700 dark:text-slate-300">{line.description}</span>
                              ) : (
                                <Input
                                  value={line.description}
                                  onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                  placeholder={t('quotation.descriptionOverride', 'Description override')}
                                  className="h-9 bg-white text-sm text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isViewMode ? (
                                <span className="text-sm text-slate-700 dark:text-slate-300">{line.qty}</span>
                              ) : (
                                <Input
                                  type="number"
                                  min="1"
                                  value={line.qty}
                                  onChange={(e) => handleLineChange(index, 'qty', e.target.value)}
                                  className="h-9 w-20 text-right bg-white text-sm text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isViewMode ? (
                                <span className="text-sm text-slate-700 dark:text-slate-300">{formatCurrency(line.unitPrice)}</span>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.unitPrice}
                                  onChange={(e) => handleLineChange(index, 'unitPrice', e.target.value)}
                                  className="h-9 w-28 text-right bg-white text-sm text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isViewMode ? (
                                <span className="text-sm text-slate-700 dark:text-slate-300">{line.discountPercent}%</span>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={line.discountPercent}
                                  onChange={(e) => handleLineChange(index, 'discountPercent', e.target.value)}
                                  className="h-9 w-20 text-right bg-white text-sm text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isViewMode ? (
                                <span className="text-sm text-slate-700 dark:text-slate-300">{line.taxRate}%</span>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={line.taxRate}
                                  onChange={(e) => handleLineChange(index, 'taxRate', e.target.value)}
                                  className="h-9 w-20 text-right bg-white text-sm text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-slate-950 dark:text-white">{formatCurrency(line.lineTotal)}</TableCell>
                            {!isViewMode && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLine(index)}
                                  disabled={formData.lines.length === 1}
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {!isViewMode && (
                    <div className="p-4">
                      <Button variant="outline" onClick={addLine} className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200">
                        <Plus className="h-4 w-4" />
                        {t('quotation.addLine', 'Add Line')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Totals */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-50 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60">
                      <Calculator className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">{t('quotation.summary', 'Summary')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                    <span>{t('quotation.subtotal', 'Subtotal')}</span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                    <span>{t('quotation.discount', 'Discount')}</span>
                    <span className="font-medium text-red-600 dark:text-red-400">- {formatCurrency(calculateDiscount())}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                    <span>{t('quotation.tax', 'Tax')}</span>
                    <span className="font-medium">{formatCurrency(calculateTax())}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-bold dark:border-slate-800">
                    <span className="text-slate-950 dark:text-white">{t('quotation.total', 'Total')}</span>
                    <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency(calculateTotal())}</span>
                  </div>
                  <div className="mt-1 text-right text-xs text-slate-500 dark:text-slate-500">{formData.currency}</div>
                </CardContent>
              </Card>

              {/* Status snapshot */}
              {isViewMode && quotation && (
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50">
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Status Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Status</span>
                      <Badge variant="outline" className="capitalize dark:border-slate-700 dark:text-slate-300">{quotation.status}</Badge>
                    </div>
                    {quotation.quotationDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Quotation Date</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(quotation.quotationDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {quotation.expiryDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Expiry Date</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(quotation.expiryDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Currency</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{quotation.currency || 'RWF'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Lines</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{formData.lines.length}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!isViewMode && (
                <div className="flex flex-col gap-3">
                  <Button onClick={() => handleSave(false)} disabled={saving || !formData.client} className="h-10 gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t('quotation.saveDraft', 'Save Draft')}
                  </Button>
                  <Button variant="default" onClick={() => handleSave(true)} disabled={saving || !formData.client} className="h-10 gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {t('quotation.sendToClient', 'Save & Send')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}