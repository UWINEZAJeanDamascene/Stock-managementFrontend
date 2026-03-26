import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { deliveryNotesApi, quotationsApi, clientsApi, productsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Plus, 
  Trash2,
  CheckCircle,
  Truck
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
  trackBatches?: boolean;
  trackSerials?: boolean;
}

interface Client {
  _id: string;
  name: string;
  code?: string;
}

interface Quotation {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
    code?: string;
  };
  quotationDate: string;
  validUntil: string;
  status: string;
  grandTotal: number;
  currencyCode: string;
  lines: Array<{
    _id: string;
    product: {
      _id: string;
      name: string;
      sku: string;
      trackBatches?: boolean;
      trackSerials?: boolean;
    };
    qtyOrdered: number;
    qtyDelivered: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

interface DeliveryNoteLine {
  _id: string;
  product: string;
  productName?: string;
  productSku?: string;
  qtyOrdered: number;
  qtyDelivered: number;
  qtyToDeliver: number;
  unitPrice: number;
  lineTotal: number;
  trackBatches?: boolean;
  trackSerials?: boolean;
  batchId?: string;
  serialNumbers?: string[];
}

interface DeliveryNoteFormData {
  quotation: string;
  client: string;
  deliveryDate: string;
  deliveredBy: string;
  vehicle: string;
  deliveryAddress: string;
  carrier: string;
  trackingNumber: string;
  notes: string;
  lines: DeliveryNoteLine[];
}

const emptyLine: DeliveryNoteLine = {
  _id: '',
  product: '',
  productName: '',
  productSku: '',
  qtyOrdered: 0,
  qtyDelivered: 0,
  qtyToDeliver: 0,
  unitPrice: 0,
  lineTotal: 0,
};

export default function DeliveryNoteCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [formData, setFormData] = useState<DeliveryNoteFormData>({
    quotation: '',
    client: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    deliveredBy: '',
    vehicle: '',
    deliveryAddress: '',
    carrier: '',
    trackingNumber: '',
    notes: '',
    lines: [],
  });

  const fetchQuotations = useCallback(async () => {
    try {
      const response = await quotationsApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        const data = response.data as any;
        const quotationData = Array.isArray(data) ? data : (data.quotations || []);
        setQuotations(quotationData as Quotation[]);
      }
    } catch (error) {
      console.error('Failed to fetch quotations:', error);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientsApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        const clientData = Array.isArray(response.data)
          ? response.data
          : (response.data as any[]);
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
          : (response.data as any[]);
        setProducts(productData as Product[]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  }, []);

  const fetchDeliveryNote = useCallback(async (deliveryNoteId: string) => {
    setLoading(true);
    try {
      const response = await deliveryNotesApi.getById(deliveryNoteId);
      if (response.success && response.data) {
        const dn = response.data as any;
        setFormData({
          quotation: dn.quotation?._id || '',
          client: dn.client?._id || '',
          deliveryDate: dn.deliveryDate ? dn.deliveryDate.split('T')[0] : '',
          deliveredBy: dn.deliveredBy || '',
          vehicle: dn.vehicle || '',
          deliveryAddress: dn.deliveryAddress || '',
          carrier: dn.carrier || '',
          trackingNumber: dn.trackingNumber || '',
          notes: dn.notes || '',
          lines: dn.lines ? dn.lines.map((line: any) => ({
            _id: line._id,
            product: line.product?._id || line.product || '',
            productName: line.product?.name,
            productSku: line.product?.sku,
            qtyOrdered: line.qtyOrdered || 0,
            qtyDelivered: line.qtyDelivered || 0,
            qtyToDeliver: line.deliveredQty || 0,
            unitPrice: line.unitPrice || 0,
            lineTotal: line.lineTotal || 0,
            trackBatches: line.product?.trackBatches,
            trackSerials: line.product?.trackSerials,
          })) : [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch delivery note:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
    fetchClients();
    fetchProducts();
  }, [fetchQuotations, fetchClients, fetchProducts]);

  useEffect(() => {
    if (isEditMode && id) {
      fetchDeliveryNote(id);
    }
  }, [id, isEditMode, fetchDeliveryNote]);

  const handleQuotationChange = (quotationId: string) => {
    const quotation = quotations.find(q => q._id === quotationId);
    if (quotation) {
      // Transform quotation lines to delivery note lines
      const lines = quotation.lines.map(line => ({
        _id: line._id,
        product: line.product._id,
        productName: line.product.name,
        productSku: line.product.sku,
        qtyOrdered: line.qtyOrdered,
        qtyDelivered: line.qtyDelivered,
        qtyToDeliver: line.qtyOrdered - (line.qtyDelivered || 0), // Default to remaining qty
        unitPrice: line.unitPrice,
        lineTotal: (line.qtyOrdered - (line.qtyDelivered || 0)) * line.unitPrice,
        trackBatches: line.product.trackBatches,
        trackSerials: line.product.trackSerials,
      }));

      setFormData(prev => ({
        ...prev,
        quotation: quotationId,
        client: quotation.client._id,
        lines,
      }));
    }
  };

  const handleLineChange = (index: number, field: keyof DeliveryNoteLine, value: any) => {
    const newLines = [...formData.lines];
    const line = { ...newLines[index] };

    if (field === 'qtyToDeliver') {
      const qty = parseFloat(value) || 0;
      line.qtyToDeliver = Math.min(qty, line.qtyOrdered - line.qtyDelivered); // Can't deliver more than remaining
      line.lineTotal = line.qtyToDeliver * line.unitPrice;
    } else if (field === 'batchId') {
      line.batchId = value;
    } else if (field === 'serialNumbers') {
      line.serialNumbers = value;
    }

    newLines[index] = line;
    setFormData(prev => ({ ...prev, lines: newLines }));
  };

  const calculateTotal = () => {
    return formData.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  };

  const handleSave = async (confirmImmediately: boolean = false) => {
    if (!formData.quotation || formData.lines.length === 0) {
      alert(t('deliveryNote.selectQuotation', 'Please select a quotation'));
      return;
    }

    // Validate all lines have qty to deliver > 0
    const hasInvalidLines = formData.lines.every(line => line.qtyToDeliver === 0);
    if (hasInvalidLines) {
      alert(t('deliveryNote.enterDeliveryQty', 'Please enter quantity to deliver for at least one line'));
      return;
    }

    setSaving(true);
    try {
      const deliveryNoteData = {
        quotation: formData.quotation,
        deliveryDate: formData.deliveryDate,
        deliveredBy: formData.deliveredBy,
        vehicle: formData.vehicle,
        deliveryAddress: formData.deliveryAddress,
        carrier: formData.carrier,
        trackingNumber: formData.trackingNumber,
        notes: formData.notes,
        lines: formData.lines
          .filter(line => line.qtyToDeliver > 0)
          .map(line => ({
            product: line.product,
            deliveredQty: line.qtyToDeliver,
            unitPrice: line.unitPrice,
            batchId: line.batchId,
            serialNumbers: line.serialNumbers,
          })),
        autoConfirm: confirmImmediately,
      };

      let response;
      if (isEditMode && id) {
        response = await deliveryNotesApi.update(id, deliveryNoteData);
      } else {
        response = await deliveryNotesApi.create(deliveryNoteData);
      }

      if (response.success && response.data) {
        const dnId = (response.data as any)._id;
        if (confirmImmediately && dnId) {
          await deliveryNotesApi.confirm(dnId, {});
        }
        navigate('/delivery-notes');
      }
    } catch (error) {
      console.error('Failed to save delivery note:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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
          <Button variant="ghost" onClick={() => navigate('/delivery-notes')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditMode ? t('deliveryNote.editDeliveryNote', 'Edit Delivery Note') : t('deliveryNote.newDeliveryNote', 'New Delivery Note')}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('deliveryNote.basicInfo', 'Basic Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('deliveryNote.quotation')} *</Label>
                  <Select 
                    value={formData.quotation} 
                    onValueChange={(value) => handleQuotationChange(value)}
                    disabled={isEditMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('deliveryNote.selectQuotation')} />
                    </SelectTrigger>
                    <SelectContent>
                      {quotations.map(q => (
                        <SelectItem key={q._id} value={q._id}>
                          {q.referenceNo} - {q.client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('deliveryNote.client')}</Label>
                    <Input value={formData.client ? clients.find(c => c._id === formData.client)?.name || '' : ''} disabled />
                  </div>
                  <div>
                    <Label>{t('deliveryNote.deliveryDate')}</Label>
                    <Input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('deliveryNote.deliveredBy')}</Label>
                    <Input
                      value={formData.deliveredBy}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliveredBy: e.target.value }))}
                      placeholder={t('deliveryNote.deliveredByPlaceholder', 'Driver name')}
                    />
                  </div>
                  <div>
                    <Label>{t('deliveryNote.vehicle')}</Label>
                    <Input
                      value={formData.vehicle}
                      onChange={(e) => setFormData(prev => ({ ...prev, vehicle: e.target.value }))}
                      placeholder={t('deliveryNote.vehiclePlaceholder', 'Vehicle plate number')}
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('deliveryNote.deliveryAddress')}</Label>
                  <Textarea
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    placeholder={t('deliveryNote.deliveryAddressPlaceholder', 'Delivery address')}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('deliveryNote.carrier')}</Label>
                    <Input
                      value={formData.carrier}
                      onChange={(e) => setFormData(prev => ({ ...prev, carrier: e.target.value }))}
                      placeholder={t('deliveryNote.carrierPlaceholder', 'Carrier name')}
                    />
                  </div>
                  <div>
                    <Label>{t('deliveryNote.trackingNumber')}</Label>
                    <Input
                      value={formData.trackingNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                      placeholder={t('deliveryNote.trackingNumberPlaceholder', 'Tracking number')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>{t('deliveryNote.lineItems', 'Line Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                {formData.lines.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('deliveryNote.selectQuotationFirst', 'Select a quotation first')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('deliveryNote.product', 'Product')}</TableHead>
                        <TableHead className="text-right">{t('deliveryNote.qtyOrdered', 'Qty Ordered')}</TableHead>
                        <TableHead className="text-right">{t('deliveryNote.qtyDelivered', 'Delivered')}</TableHead>
                        <TableHead className="text-right">{t('deliveryNote.qtyToDeliver', 'To Deliver')}</TableHead>
                        <TableHead className="text-right">{t('deliveryNote.unitPrice', 'Unit Price')}</TableHead>
                        <TableHead className="text-right">{t('deliveryNote.total', 'Total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.lines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="font-medium">{line.productName}</div>
                            <div className="text-sm text-muted-foreground">{line.productSku}</div>
                          </TableCell>
                          <TableCell className="text-right">{line.qtyOrdered}</TableCell>
                          <TableCell className="text-right">{line.qtyDelivered}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={line.qtyOrdered - line.qtyDelivered}
                              value={line.qtyToDeliver}
                              onChange={(e) => handleLineChange(index, 'qtyToDeliver', e.target.value)}
                              className="w-20 text-right"
                              disabled={line.qtyOrdered - line.qtyDelivered === 0}
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                              Max: {line.qtyOrdered - line.qtyDelivered}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('deliveryNote.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>{t('deliveryNote.itemsToDeliver', 'Items to Deliver')}</span>
                  <span>{formData.lines.filter(l => l.qtyToDeliver > 0).length}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                  <span>{t('deliveryNote.total', 'Total')}</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('deliveryNote.notes', 'Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('deliveryNote.notesPlaceholder', 'Add notes...')}
                  rows={4}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => handleSave(false)}
                disabled={saving || !formData.quotation}
                variant="outline"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('deliveryNote.saveDraft', 'Save as Draft')}
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving || !formData.quotation}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {t('deliveryNote.confirmDispatch', 'Confirm & Dispatch')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}