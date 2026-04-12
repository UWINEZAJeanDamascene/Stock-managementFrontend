import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { recurringInvoicesApi, clientsApi, productsApi, warehousesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  Save,
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  Package,
  Calendar,
  Repeat,
  X
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Product {
  _id: string;
  name: string;
  code?: string;
  unitPrice?: number;
  averageCost?: number;
  cost?: number;
  taxRate?: number;
  isStockable?: boolean;
}

interface Warehouse {
  _id: string;
  name: string;
  code?: string;
}

interface Client {
  _id: string;
  name: string;
  code?: string;
}

interface LineItem {
  id: string;
  product: Product | null;
  productName: string;
  productCode: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
  discountPct: number;
  warehouse: Warehouse | null;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

interface RecurringInvoice {
  _id: string;
  referenceNo: string;
  client: Client;
  lines: any[];
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
    interval: number;
    dayOfMonth?: number;
    dayOfWeek?: number;
  };
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  autoConfirm: boolean;
  currencyCode: string;
  notes?: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

// Helper to convert Decimal values
const toNumber = (val: any): number => {
  if (typeof val === 'object' && val?.$numberDecimal) {
    return parseFloat(val.$numberDecimal);
  }
  return Number(val) || 0;
};

export default function RecurringInvoiceFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [interval, setInterval] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(undefined);
  const [dayOfWeek, setDayOfWeek] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [currencyCode, setCurrencyCode] = useState('USD');

  const fetchData = useCallback(async () => {
    try {
      const [clientsRes, productsRes, warehousesRes] = await Promise.all([
        clientsApi.getAll({ limit: 100 }),
        productsApi.getAll({ limit: 100 }),
        warehousesApi.getAll({ limit: 100 }),
      ]);
      
      if (clientsRes.success && clientsRes.data) {
        setClients(Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data as any).clients || []);
      }
      if (productsRes.success && productsRes.data) {
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data as any).products || []);
      }
      if (warehousesRes.success && warehousesRes.data) {
        setWarehouses(Array.isArray(warehousesRes.data) ? warehousesRes.data : (warehousesRes.data as any).warehouses || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, []);

  const fetchRecurringInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await recurringInvoicesApi.getById(id);
      if (response.success && response.data) {
        const ri = response.data as RecurringInvoice;
        setSelectedClient(ri.client?._id || '');
        setFrequency(ri.schedule?.frequency || 'monthly');
        setInterval(ri.schedule?.interval || 1);
        setDayOfMonth(ri.schedule?.dayOfMonth);
        setDayOfWeek(ri.schedule?.dayOfWeek);
        setStartDate(ri.startDate ? new Date(ri.startDate).toISOString().split('T')[0] : '');
        setEndDate(ri.endDate ? new Date(ri.endDate).toISOString().split('T')[0] : '');
        setAutoConfirm(ri.autoConfirm || false);
        setNotes(ri.notes || '');
        setCurrencyCode(ri.currencyCode || 'USD');
        
        // Transform lines
        if (ri.lines && ri.lines.length > 0) {
          setLines(ri.lines.map((line: any) => ({
            id: line._id || line.lineId || Math.random().toString(36).substr(2, 9),
            product: line.product || null,
            productName: line.productName || line.product?.name || '',
            productCode: line.productCode || line.product?.code || '',
            qty: toNumber(line.qty || line.quantity) || 1,
            unitPrice: toNumber(line.unitPrice) || 0,
            taxRate: toNumber(line.taxRate) || 0,
            discountPct: toNumber(line.discountPct || line.discount) || 0,
            warehouse: line.warehouse || null,
            lineSubtotal: toNumber(line.lineSubtotal) || 0,
            lineTax: toNumber(line.lineTax) || 0,
            lineTotal: toNumber(line.lineTotal) || 0,
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch recurring invoice:', error);
      toast.error('Failed to load recurring invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isEdit) {
      fetchRecurringInvoice();
    }
  }, [isEdit, fetchRecurringInvoice]);

  const calculateLineTotals = (line: LineItem): LineItem => {
    const qty = line.qty || 0;
    const unitPrice = line.unitPrice || 0;
    const taxRate = line.taxRate || 0;
    const discountPct = line.discountPct || 0;
    
    const discountedPrice = unitPrice * (1 - discountPct / 100);
    const lineSubtotal = qty * discountedPrice;
    const lineTax = lineSubtotal * (taxRate / 100);
    const lineTotal = lineSubtotal + lineTax;
    
    return {
      ...line,
      lineSubtotal,
      lineTax,
      lineTotal,
    };
  };

  const handleAddLine = () => {
    const newLine: LineItem = {
      id: Math.random().toString(36).substr(2, 9),
      product: null,
      productName: '',
      productCode: '',
      qty: 1,
      unitPrice: 0,
      taxRate: 0,
      discountPct: 0,
      warehouse: null,
      lineSubtotal: 0,
      lineTax: 0,
      lineTotal: 0,
    };
    setLines([...lines, newLine]);
  };

  const handleRemoveLine = (lineId: string) => {
    setLines(lines.filter(l => l.id !== lineId));
  };

  const handleLineChange = (lineId: string, field: string, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== lineId) return line;
      
      let updatedLine = { ...line };
      
      if (field === 'product') {
        const product = products.find(p => p._id === value);
        updatedLine.product = product || null;
        updatedLine.productName = product?.name || '';
        updatedLine.productCode = product?.code || '';
        updatedLine.unitPrice = toNumber(product?.unitPrice || product?.averageCost || 0);
        updatedLine.taxRate = toNumber(product?.taxRate || 0);
      } else if (field === 'warehouse') {
        const warehouse = warehouses.find(w => w._id === value);
        updatedLine.warehouse = warehouse || null;
      } else if (field === 'qty') {
        updatedLine.qty = Math.max(0.0001, parseFloat(value) || 0);
      } else if (field === 'unitPrice') {
        updatedLine.unitPrice = Math.max(0, parseFloat(value) || 0);
      } else if (field === 'taxRate') {
        updatedLine.taxRate = Math.max(0, Math.min(100, parseFloat(value) || 0));
      } else if (field === 'discountPct') {
        updatedLine.discountPct = Math.max(0, Math.min(100, parseFloat(value) || 0));
      }
      
      return calculateLineTotals(updatedLine);
    }));
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const taxAmount = lines.reduce((sum, line) => sum + line.lineTax, 0);
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const handleSave = async () => {
    if (!selectedClient) {
      toast.error('Please select a client');
      return;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client: selectedClient,
        schedule: {
          frequency,
          interval,
          ...(dayOfMonth !== undefined && { dayOfMonth }),
          ...(dayOfWeek !== undefined && { dayOfWeek }),
        },
        startDate,
        ...(endDate && { endDate }),
        autoConfirm,
        notes,
        currencyCode,
        status: 'active',
        nextRunDate: startDate,
        lines: lines.map(line => ({
          product: line.product?._id,
          productName: line.productName,
          productCode: line.productCode,
          qty: line.qty,
          quantity: line.qty,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          discountPct: line.discountPct,
          discount: line.discountPct,
          warehouse: line.warehouse?._id,
          lineSubtotal: line.lineSubtotal,
          lineTax: line.lineTax,
          lineTotal: line.lineTotal,
        })),
      };

      let response;
      if (isEdit) {
        response = await recurringInvoicesApi.update(id!, payload);
      } else {
        response = await recurringInvoicesApi.create(payload);
      }

      if (response.success && response.data) {
        const savedRI = response.data as RecurringInvoice;
        toast.success(isEdit ? 'Recurring invoice updated' : 'Recurring invoice created');
        navigate(`/recurring-invoices/${savedRI._id}`);
      }
    } catch (error: any) {
      console.error('Failed to save:', error);
      toast.error(error?.message || 'Failed to save recurring invoice');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/recurring-invoices')} className="dark:text-gray-300">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold dark:text-gray-100">
                {isEdit ? t('recurringInvoices.editTitle', 'Edit Recurring Invoice') : t('recurringInvoices.createTitle', 'Create Recurring Invoice')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {t('common.save', 'Save')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                  <Calendar className="h-5 w-5" />
                  {t('recurringInvoices.basicInfo', 'Basic Information')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="dark:text-gray-200">{t('recurringInvoices.client', 'Client')} *</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient} disabled={isEdit}>
                      <SelectTrigger className="mt-2 dark:bg-slate-800 dark:border-slate-600">
                        <SelectValue placeholder={t('recurringInvoices.selectClient', 'Select Client')} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                        {clients.map(client => (
                          <SelectItem key={client._id} value={client._id} className="dark:text-gray-200">
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="dark:text-gray-200">{t('recurringInvoices.currency', 'Currency')}</Label>
                    <Select value={currencyCode} onValueChange={setCurrencyCode}>
                      <SelectTrigger className="mt-2 dark:bg-slate-800 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                        <SelectItem value="USD" className="dark:text-gray-200">USD</SelectItem>
                        <SelectItem value="EUR" className="dark:text-gray-200">EUR</SelectItem>
                        <SelectItem value="GBP" className="dark:text-gray-200">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="dark:text-gray-200">{t('recurringInvoices.frequency', 'Frequency')} *</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="mt-2 dark:bg-slate-800 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                        {FREQUENCY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="dark:text-gray-200">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="dark:text-gray-200">{t('recurringInvoices.interval', 'Every')}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={interval}
                      onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                      className="mt-2 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <Label className="dark:text-gray-200">{t('recurringInvoices.startDate', 'Start Date')} *</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-2 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="dark:text-gray-200">{t('recurringInvoices.endDate', 'End Date')} ({t('common.optional', 'optional')})</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-2 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                  {frequency === 'monthly' && (
                    <div>
                      <Label className="dark:text-gray-200">{t('recurringInvoices.dayOfMonth', 'Day of Month')} ({t('common.optional', 'optional')})</Label>
                      <Input
                        type="number"
                        min="1"
                        max="28"
                        value={dayOfMonth || ''}
                        onChange={(e) => setDayOfMonth(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="mt-2 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
                        placeholder="1-28"
                      />
                    </div>
                  )}
                  {frequency === 'weekly' && (
                    <div>
                      <Label className="dark:text-gray-200">{t('recurringInvoices.dayOfWeek', 'Day of Week')} ({t('common.optional', 'optional')})</Label>
                      <Select 
                        value={dayOfWeek?.toString() || ''} 
                        onValueChange={(v) => setDayOfWeek(v ? parseInt(v) : undefined)}
                      >
                        <SelectTrigger className="mt-2 dark:bg-slate-800 dark:border-slate-600">
                          <SelectValue placeholder={t('recurringInvoices.selectDay', 'Select Day')} />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                          <SelectItem value="0" className="dark:text-gray-200">Sunday</SelectItem>
                          <SelectItem value="1" className="dark:text-gray-200">Monday</SelectItem>
                          <SelectItem value="2" className="dark:text-gray-200">Tuesday</SelectItem>
                          <SelectItem value="3" className="dark:text-gray-200">Wednesday</SelectItem>
                          <SelectItem value="4" className="dark:text-gray-200">Thursday</SelectItem>
                          <SelectItem value="5" className="dark:text-gray-200">Friday</SelectItem>
                          <SelectItem value="6" className="dark:text-gray-200">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="autoConfirm"
                    checked={autoConfirm}
                    onCheckedChange={(checked) => setAutoConfirm(checked as boolean)}
                  />
                  <Label htmlFor="autoConfirm" className="cursor-pointer dark:text-gray-200">
                    {t('recurringInvoices.autoConfirmLabel', 'Auto-confirm generated invoices (deduct stock and create journal entries)')}
                  </Label>
                </div>

                <div>
                  <Label className="dark:text-gray-200">{t('recurringInvoices.notes', 'Notes')}</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('recurringInvoices.notesPlaceholder', 'Additional notes...')}
                    className="mt-2 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t('recurringInvoices.lineItems', 'Line Items')}
                  </CardTitle>
                  <CardDescription>
                    {t('recurringInvoices.lineItemsDescription', 'Products to include in each generated invoice')}
                  </CardDescription>
                </div>
                <Button onClick={handleAddLine} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('recurringInvoices.addLine', 'Add Line')}
                </Button>
              </CardHeader>
              <CardContent>
                {lines.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('recurringInvoices.noLineItems', 'No line items yet. Click "Add Line" to add products.')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-2 px-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px] sm:min-w-[180px]">{t('recurringInvoices.product', 'Product')}</TableHead>
                          <TableHead className="min-w-[100px] sm:min-w-[140px]">{t('recurringInvoices.warehouse', 'Warehouse')}</TableHead>
                          <TableHead className="text-right min-w-[80px] sm:min-w-[100px]">{t('recurringInvoices.qty', 'Qty')}</TableHead>
                          <TableHead className="text-right min-w-[100px] sm:min-w-[120px]">{t('recurringInvoices.unitPrice', 'Unit Price')}</TableHead>
                          <TableHead className="text-right min-w-[70px] sm:min-w-[80px]">{t('recurringInvoices.taxRate', 'Tax %')}</TableHead>
                          <TableHead className="text-right min-w-[70px] sm:min-w-[80px]">{t('recurringInvoices.discount', 'Discount %')}</TableHead>
                          <TableHead className="text-right min-w-[100px]">{t('recurringInvoices.total', 'Total')}</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>
                              <Select
                                value={line.product?._id || ''}
                                onValueChange={(v) => handleLineChange(line.id, 'product', v)}
                              >
                                <SelectTrigger className="w-full min-w-[140px]">
                                  <SelectValue placeholder={t('recurringInvoices.selectProduct', 'Select Product')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map(product => (
                                    <SelectItem key={product._id} value={product._id}>
                                      {product.name} ({product.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={line.warehouse?._id || ''}
                                onValueChange={(v) => handleLineChange(line.id, 'warehouse', v)}
                              >
                                <SelectTrigger className="w-full min-w-[100px]">
                                  <SelectValue placeholder={t('recurringInvoices.selectWarehouse', 'Select')} />
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
                                min="0.0001"
                                step="0.0001"
                                value={line.qty}
                                onChange={(e) => handleLineChange(line.id, 'qty', e.target.value)}
                                className="text-right w-full min-w-[80px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice}
                                onChange={(e) => handleLineChange(line.id, 'unitPrice', e.target.value)}
                                className="text-right w-full min-w-[100px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={line.taxRate}
                                onChange={(e) => handleLineChange(line.id, 'taxRate', e.target.value)}
                                className="text-right w-full min-w-[70px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={line.discountPct}
                                onChange={(e) => handleLineChange(line.id, 'discountPct', e.target.value)}
                                className="text-right w-full min-w-[70px]"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(line.lineTotal)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLine(line.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t('recurringInvoices.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('recurringInvoices.subtotal', 'Subtotal')}</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('recurringInvoices.tax', 'Tax')}</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="border-t pt-4 flex justify-between">
                  <span className="font-bold">{t('recurringInvoices.total', 'Total')}</span>
                  <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
                </div>
                
                {autoConfirm && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">{t('recurringInvoices.autoConfirmEnabled', 'Auto-Confirm Enabled')}</p>
                        <p className="text-blue-700">
                          {t('recurringInvoices.autoConfirmDescription', 'Generated invoices will be automatically confirmed with stock deduction and journal entries.')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
