import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { creditNotesApi, invoicesApi, productsApi, warehousesApi } from '@/lib/api';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
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
import { useTranslation } from 'react-i18next';

interface CreditNoteLine {
  _id?: string;
  invoiceLineId: string;
  product: {
    _id: string;
    name: string;
    code?: string;
  };
  productName: string;
  productCode: string;
  originalQty: number; // ADDED: Original invoice quantity
  quantity: number; // Qty to credit (user enters this)
  unitPrice: number;
  unitCost: number;
  taxRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
  returnToWarehouse?: string;
}

interface CreditNote {
  _id: string;
  referenceNo: string;
  creditDate: string;
  type: 'goods_return' | 'price_adjustment' | 'cancelled_order';
  status: string;
  currencyCode: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  grandTotal?: number;
  invoice?: {
    _id: string;
    referenceNo: string;
  };
  client?: {
    _id: string;
    name: string;
  };
  reason: string;
  lines: CreditNoteLine[];
  notes?: string;
}

interface Invoice {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
  };
  lines: any[];
  currencyCode: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

const TYPE_OPTIONS = [
  { value: 'goods_return', label: 'Goods Return' },
  { value: 'price_adjustment', label: 'Price Adjustment' },
  { value: 'cancelled_order', label: 'Cancelled Order' },
];

// Helper to convert Decimal values
const toNumber = (val: any): number => {
  if (typeof val === 'object' && val?.$numberDecimal) {
    return parseFloat(val.$numberDecimal);
  }
  return Number(val) || 0;
};

export default function CreditNoteCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  // Form fields
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [creditDate, setCreditDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'goods_return' | 'price_adjustment' | 'cancelled_order'>('goods_return');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<CreditNoteLine[]>([]);

  const fetchInvoices = useCallback(async () => {
    try {
      // Fetch invoices that can have credit notes: confirmed, partially_paid, fully_paid
      const response = await invoicesApi.getAll({ 
        status: 'confirmed,partially_paid,fully_paid', 
        limit: 100 
      });
      if (response.success && response.data) {
        const data = response.data as any;
        const invoiceData = Array.isArray(data) ? data : (data.invoices || []);
        console.log(`[CreditNoteCreate] Fetched ${invoiceData.length} invoices`);
        setInvoices(invoiceData as Invoice[]);
      } else {
        console.error('[CreditNoteCreate] Failed to fetch invoices:', response);
      }
    } catch (error) {
      console.error('[CreditNoteCreate] Error fetching invoices:', error);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await warehousesApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        const data = response.data as any;
        const warehouseData = Array.isArray(data) ? data : (data.warehouses || []);
        setWarehouses(warehouseData as Warehouse[]);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  }, []);

  const fetchCreditNote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await creditNotesApi.getById(id);
      if (response.success && response.data) {
        const cn = response.data as CreditNote;
        setCreditNote(cn);
        setSelectedInvoice(cn.invoice?._id || '');
        setCreditDate(cn.creditDate ? new Date(cn.creditDate).toISOString().split('T')[0] : '');
        setType(cn.type);
        setReason(cn.reason || '');
        setNotes(cn.notes || '');
        
        // If credit note has lines, use them; otherwise populate from invoice
        if (cn.lines && cn.lines.length > 0) {
          setLines(cn.lines);
        } else if (cn.invoice?._id) {
          // Auto-populate lines from invoice
          const invoice = invoices.find(inv => inv._id === cn.invoice?._id);
          if (invoice && invoice.lines) {
            const creditNoteLines: CreditNoteLine[] = invoice.lines.map((line: any) => ({
              invoiceLineId: line._id || line.lineId,
              product: line.product,
              productName: line.productName || line.product?.name || '',
              productCode: line.productCode || line.product?.code || '',
              originalQty: line.quantity || 0, // ADDED: Store original invoice qty
              quantity: 0,
              unitPrice: toNumber(line.unitPrice) || 0, // FIXED: Convert Decimal to number
              unitCost: toNumber(line.unitCost) || toNumber(line.product?.averageCost) || 0,
              taxRate: toNumber(line.taxRate) || 0, // FIXED: Convert Decimal to number
              lineSubtotal: 0,
              lineTax: 0,
              lineTotal: 0,
            }));
            setLines(creditNoteLines);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch credit note:', error);
    } finally {
      setLoading(false);
    }
  }, [id, invoices]);

  useEffect(() => {
    fetchInvoices();
    fetchWarehouses();
  }, [fetchInvoices, fetchWarehouses]);

  useEffect(() => {
    if (id) {
      fetchCreditNote();
    }
  }, [id, fetchCreditNote]);

  const handleInvoiceSelect = async (invoiceId: string) => {
    setSelectedInvoice(invoiceId);
    if (!invoiceId) {
      setLines([]);
      return;
    }

    const invoice = invoices.find(inv => inv._id === invoiceId);
    if (!invoice) return;

    // Transform invoice lines to credit note lines
    const creditNoteLines: CreditNoteLine[] = invoice.lines.map((line: any) => ({
      invoiceLineId: line._id || line.lineId,
      product: line.product,
      productName: line.productName || line.product?.name || '',
      productCode: line.productCode || line.product?.code || '',
      originalQty: line.quantity || 0, // ADDED: Store original invoice qty
      quantity: 0, // User enters qty to credit
      unitPrice: toNumber(line.unitPrice) || 0, // FIXED: Convert Decimal to number
      unitCost: toNumber(line.unitCost) || toNumber(line.product?.averageCost) || 0,
      taxRate: toNumber(line.taxRate) || 0, // FIXED: Convert Decimal to number
      lineSubtotal: 0,
      lineTax: 0,
      lineTotal: 0,
    }));

    setLines(creditNoteLines);
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updatedLines = [...lines];
    const line = { ...updatedLines[index] };
    
    if (field === 'quantity') {
      const enteredQty = Math.max(0, parseFloat(value) || 0);
      // Validate: credited qty cannot exceed original invoice qty
      const maxQty = toNumber(line.originalQty);
      line.quantity = Math.min(enteredQty, maxQty);
    } else if (field === 'returnToWarehouse') {
      line.returnToWarehouse = value;
    }
    
    // Recalculate totals using toNumber for Decimal handling
    const quantity = toNumber(line.quantity);
    const unitPrice = toNumber(line.unitPrice);
    const taxRate = toNumber(line.taxRate);
    
    line.lineSubtotal = quantity * unitPrice;
    line.lineTax = line.lineSubtotal * (taxRate / 100);
    line.lineTotal = line.lineSubtotal + line.lineTax;
    
    updatedLines[index] = line;
    setLines(updatedLines);
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + toNumber(line.lineSubtotal), 0);
    const taxAmount = lines.reduce((sum, line) => sum + toNumber(line.lineTax), 0);
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
  };

  const handleSave = async () => {
    if (!reason) {
      alert(t('creditNotes.reasonRequired', 'Reason is required'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        invoice: selectedInvoice,
        creditDate,
        type,
        reason,
        notes,
        lines: lines.map(line => ({
          invoiceLineId: line.invoiceLineId,
          product: line.product._id,
          productName: line.productName,
          productCode: line.productCode,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCost: line.unitCost,
          taxRate: line.taxRate,
          lineSubtotal: line.lineSubtotal,
          lineTax: line.lineTax,
          lineTotal: line.lineTotal,
          returnToWarehouse: line.returnToWarehouse,
        })),
      };

      let response;
      if (isEdit) {
        response = await creditNotesApi.update(id!, payload);
      } else {
        response = await creditNotesApi.create(payload);
      }

      if (response.success && response.data) {
        const savedCN = response.data as CreditNote;
        navigate(`/credit-notes/${savedCN._id}`);
      }
    } catch (error) {
      console.error('Failed to save credit note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!id) return;
    if (!reason) {
      alert(t('creditNotes.reasonRequired', 'Reason is required'));
      return;
    }

    setConfirming(true);
    try {
      const response = await creditNotesApi.confirm(id);
      if (response.success) {
        navigate(`/credit-notes/${id}`);
      }
    } catch (error) {
      console.error('Failed to confirm credit note:', error);
    } finally {
      setConfirming(false);
    }
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
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/credit-notes')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEdit ? t('creditNotes.editTitle', 'Edit Credit Note') : t('creditNotes.createTitle', 'Create Credit Note')}
              </h1>
              {creditNote && (
                <p className="text-muted-foreground">{creditNote.referenceNo}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving || !selectedInvoice}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {t('creditNotes.saveDraft', 'Save Draft')}
            </Button>
            {isEdit && creditNote?.status === 'draft' && (
              <Button onClick={handleConfirm} disabled={confirming || !reason || lines.every(l => l.quantity === 0)}>
                {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('creditNotes.confirm', 'Confirm')}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t('creditNotes.basicInfo', 'Basic Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('creditNotes.invoice', 'Invoice')} *</Label>
                    <Select value={selectedInvoice} onValueChange={handleInvoiceSelect} disabled={isEdit}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={t('creditNotes.selectInvoice', 'Select Invoice')} />
                      </SelectTrigger>
                      <SelectContent>
                        {invoices.map(inv => (
                          <SelectItem key={inv._id} value={inv._id}>
                            {inv.referenceNo} - {inv.client?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('creditNotes.typeLabel', 'Type')} *</Label>
                    <Select value={type} onValueChange={(v) => setType(v as any)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('creditNotes.date', 'Credit Date')}</Label>
                    <Input
                      type="date"
                      value={creditDate}
                      onChange={(e) => setCreditDate(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>{t('creditNotes.reason', 'Reason')} *</Label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('creditNotes.reasonPlaceholder', 'Enter reason for credit note')}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('creditNotes.notes', 'Notes')}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('creditNotes.notesPlaceholder', 'Additional notes')}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            {type === 'goods_return' && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('creditNotes.lineItems', 'Line Items')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {lines.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('creditNotes.selectInvoiceForLines', 'Select an invoice to see line items')}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('creditNotes.product', 'Product')}</TableHead>
                          <TableHead className="text-right">{t('creditNotes.invoiceQty', 'Invoiced Qty')}</TableHead>
                          <TableHead className="text-right">{t('creditNotes.unitPrice', 'Unit Price')}</TableHead>
                          <TableHead className="text-right">{t('creditNotes.taxRate', 'Tax')}</TableHead>
                          <TableHead className="text-right">{t('creditNotes.qtyToCredit', 'Qty to Credit')}</TableHead>
                          <TableHead>{t('creditNotes.returnToWarehouse', 'Return To')}</TableHead>
                          <TableHead className="text-right">{t('creditNotes.lineTotal', 'Total')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, index) => (
                          <TableRow key={line.invoiceLineId}>
                            <TableCell>
                              <div className="font-medium">{line.productName}</div>
                              <div className="text-sm text-muted-foreground">{line.productCode}</div>
                            </TableCell>
                            <TableCell className="text-right font-medium text-muted-foreground">
                              {toNumber(line.originalQty)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(line.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right">
                              {toNumber(line.taxRate)}%
                            </TableCell>
                            <TableCell className="w-28">
                              <Input
                                type="number"
                                min="0"
                                max={toNumber(line.originalQty)}
                                value={line.quantity}
                                onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                                className="text-right"
                                placeholder={`Max: ${toNumber(line.originalQty)}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={line.returnToWarehouse || ''} 
                                onValueChange={(v) => handleLineChange(index, 'returnToWarehouse', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t('creditNotes.selectWarehouse', 'Select')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {warehouses.map(wh => (
                                    <SelectItem key={wh._id} value={wh._id}>
                                      {wh.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(line.lineTotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {type === 'price_adjustment' && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('creditNotes.priceAdjustments', 'Price Adjustments')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    {t('creditNotes.priceAdjustmentInfo', 'Price adjustments can be added after selecting an invoice')}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t('creditNotes.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('creditNotes.subtotal', 'Subtotal')}</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('creditNotes.tax', 'Tax')}</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="border-t pt-4 flex justify-between">
                  <span className="font-bold">{t('creditNotes.total', 'Total')}</span>
                  <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
                </div>
                
                {creditNote && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">{t('creditNotes.statusLabel', 'Status')}</span>
                      <Badge variant={creditNote.status === 'draft' ? 'secondary' : 'default'}>
                        {creditNote.status}
                      </Badge>
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