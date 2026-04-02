import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { deliveryNotesApi, invoicesApi, clientsApi, productsApi, warehousesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { ErrorBoundary } from '../../components/ErrorBoundary';
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

interface Invoice {
  _id: string;
  referenceNo: string;
  invoiceNumber?: string;
  client: {
    _id: string;
    name: string;
    code?: string;
    contact?: {
      phone?: string;
      address?: string;
    };
  };
  invoiceDate: string;
  dueDate: string;
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
    qty: number;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

function DeliveryNoteCreatePageContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice');
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouse, setWarehouse] = useState<string>('');

  const [formData, setFormData] = useState<DeliveryNoteFormData>({
    invoice: '',
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

  // Load invoice data if invoice ID is provided
  useEffect(() => {
    if (invoiceId) {
      const loadInvoiceData = async () => {
        try {
          const response = await invoicesApi.getById(invoiceId);
          if (response.success && response.data) {
            const invoice = response.data as any;
            setFormData(prev => ({
              ...prev,
              invoice: invoiceId,
              client: invoice.client?._id || invoice.client || '',
              deliveryAddress: invoice.customerAddress || invoice.client?.contact?.address || '',
              lines: invoice.lines ? invoice.lines.map((line: any) => ({
                _id: line._id || line.lineId,
                product: line.product?._id || line.product || '',
                productName: line.product?.name || '',
                productSku: line.product?.sku || '',
                qtyOrdered: parseFloat(line.qty) || parseFloat(line.quantity) || 0,
                qtyDelivered: line.qtyDelivered || 0,
                qtyToDeliver: (parseFloat(line.qty) || parseFloat(line.quantity) || 0) - (line.qtyDelivered || 0),
                unitPrice: parseFloat(line.unitPrice) || 0,
                lineTotal: parseFloat(line.lineTotal) || 0,
                trackBatches: line.product?.trackBatches,
                trackSerials: line.product?.trackSerials,
              })) : [],
            }));
          }
        } catch (error) {
          console.error('Failed to load invoice:', error);
        }
      };
      loadInvoiceData();
    }
  }, [invoiceId]);

  const fetchInvoices = useCallback(async () => {
    try {
      // Fetch all invoices and filter for confirmed/draft on client side
      const response = await invoicesApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        const data = response.data as any;
        const allInvoices = Array.isArray(data) ? data : (data.invoices || []);
        // Filter for confirmed and draft status
        const filteredInvoices = allInvoices.filter((inv: any) => 
          inv.status === 'confirmed' || inv.status === 'draft'
        );
        setInvoices(filteredInvoices as Invoice[]);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
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

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await warehousesApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        const warehouseData = Array.isArray(response.data)
          ? response.data
          : (response.data as any[]);
        setWarehouses(warehouseData);
        if (warehouseData.length > 0) {
          setWarehouse(warehouseData[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
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
            invoiceLineId: line.invoiceLineId?._id || line.invoiceLineId || '',
            product: line.product?._id || line.product || '',
            productName: line.product?.name || '',
            productSku: line.product?.sku || '',
            qtyOrdered: line.qtyOrdered || 0,
            qtyDelivered: line.qtyDelivered || 0,
            qtyToDeliver: line.deliveredQty || 0,
            unitPrice: line.unitPrice || 0,
            lineTotal: line.lineTotal || 0,
            trackBatches: line.product?.trackBatches,
            trackSerials: line.product?.trackSerials,
          })) : [],
        });
        if (dn.warehouse) {
          setWarehouse(dn.warehouse._id || dn.warehouse);
        }
      }
    } catch (error) {
      console.error('Failed to fetch delivery note:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchClients();
    fetchProducts();
    fetchWarehouses();
  }, [fetchInvoices, fetchClients, fetchProducts, fetchWarehouses]);

  useEffect(() => {
    if (isEditMode && id) {
      fetchDeliveryNote(id);
    }
  }, [id, isEditMode, fetchDeliveryNote]);

  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv._id === invoiceId);
    if (invoice) {
      // Transform invoice lines to delivery note lines
      const lines = invoice.lines.map(line => ({
        _id: line._id,
        invoiceLineId: line._id,
        product: line.product?._id || line.product || '',
        productName: line.product?.name || '',
        productSku: line.product?.sku || '',
        qtyOrdered: parseFloat(line.qty as any) || parseFloat(line.quantity as any) || 0,
        qtyDelivered: 0,
        qtyToDeliver: (parseFloat(line.qty as any) || parseFloat(line.quantity as any) || 0),
        unitPrice: parseFloat(line.unitPrice as any) || 0,
        lineTotal: parseFloat(line.lineTotal as any) || 0,
        trackBatches: line.product?.trackBatches,
        trackSerials: line.product?.trackSerials,
      }));

      setFormData(prev => ({
        ...prev,
        invoice: invoiceId,
        client: invoice.client?._id || '',
        deliveryAddress: invoice.client?.contact?.address || '',
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
    if (!warehouse) {
      alert('Please select a warehouse');
      return;
    }

    if (!formData.invoice || formData.lines.length === 0) {
      alert(t('deliveryNote.selectInvoice', 'Please select an invoice'));
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
      // Use invoice from form directly
      const invoiceIdValue = invoiceId || formData.invoice;
      
      if (!invoiceIdValue) {
        alert('Please select an invoice to create delivery note');
        return;
      }
      
      const deliveryNoteData = {
        invoice: invoiceIdValue,
        warehouse: warehouse,
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
            invoiceLineId: line._id,
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
                  <Label>{t('deliveryNote.invoice')} *</Label>
                  <Select 
                    value={formData.invoice} 
                    onValueChange={(value) => handleInvoiceChange(value)}
                    disabled={isEditMode || !!invoiceId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('deliveryNote.selectInvoice')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-96 overflow-y-auto">
                      {invoices.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No invoices available
                        </div>
                      ) : (
                        invoices.map(inv => (
                          <SelectItem key={inv._id} value={inv._id}>
                            {inv.referenceNo || inv.invoiceNumber} - {inv.client?.name || 'No client'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Warehouse *</Label>
                  <Select 
                    value={warehouse} 
                    onValueChange={(value) => setWarehouse(value)}
                    disabled={isEditMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(wh => (
                        <SelectItem key={wh._id} value={wh._id}>
                          {wh.name}
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
                disabled={saving || !formData.invoice}
                variant="outline"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('deliveryNote.saveDraft', 'Save as Draft')}
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving || !formData.invoice}
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

export default function DeliveryNoteCreatePage() {
  return (
    <ErrorBoundary>
      <DeliveryNoteCreatePageContent />
    </ErrorBoundary>
  );
}