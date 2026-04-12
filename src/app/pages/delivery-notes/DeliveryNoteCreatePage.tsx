import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { deliveryNotesApi, invoicesApi, clientsApi, productsApi, warehousesApi, stockBatchApi } from '@/lib/api';
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

interface Client {
  _id: string;
  name: string;
  code?: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  trackBatches?: boolean;
  trackSerials?: boolean;
}

interface DeliveryNoteLine {
  _id: string;
  invoiceLineId?: string;
  product: string;
  productName: string;
  productSku: string;
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
  invoice: string;
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

interface BatchAutocompleteProps {
  productId: string;
  warehouseId: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function BatchAutocomplete({ productId, warehouseId, value, onChange, disabled }: BatchAutocompleteProps) {
  const [batches, setBatches] = useState<Array<{ _id: string; batchNo: string; qtyOnHand: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (productId && warehouseId) {
      fetchBatches();
    } else {
      setBatches([]);
    }
  }, [productId, warehouseId]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await stockBatchApi.getAll({
        product: productId,
        warehouse: warehouseId,
        limit: 100
      });
      if (response.success && response.data) {
        setBatches(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedBatch = batches.find(b => b._id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full px-3 py-2 text-sm border rounded-md text-left flex items-center justify-between dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        disabled={disabled}
      >
        <span className="truncate">{selectedBatch?.batchNo || 'Select batch...'}</span>
        <span className="text-xs text-gray-400">▼</span>
      </button>
      
      {open && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          ) : batches.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No batches available</div>
          ) : (
            batches.map((batch) => (
              <button
                key={batch._id}
                type="button"
                onClick={() => {
                  onChange(batch._id);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 dark:text-white ${
                  value === batch._id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <div className="font-medium">{batch.batchNo}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Qty: {batch.qtyOnHand}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
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
      console.log('[DeliveryNote] Fetching invoices...');
      const response = await invoicesApi.getAll({ limit: 100 });
      console.log('[DeliveryNote] Invoices response:', response);
      if (response.success && response.data) {
        const data = response.data as any;
        const allInvoices = data.data || data.invoices || [];
        console.log('[DeliveryNote] All invoices:', allInvoices);
        const filteredInvoices = allInvoices.filter((inv: any) => 
          inv.status === 'confirmed' || inv.status === 'draft'
        );
        console.log('[DeliveryNote] Filtered invoices:', filteredInvoices);
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
      console.log('[Edit Delivery Note] Fetching delivery note:', deliveryNoteId);
      const response = await deliveryNotesApi.getById(deliveryNoteId);
      console.log('[Edit Delivery Note] Delivery note response:', response);
      
      if (response.success && response.data) {
        const dn = response.data as any;
        console.log('[Edit Delivery Note] Delivery note data:', dn);
        console.log('[Edit Delivery Note] Lines from API:', dn.lines);
        
        // First, fetch the linked invoice to get original quantities
        let invoiceData = null;
        if (dn.invoice?._id || dn.invoice) {
          try {
            const invoiceId = dn.invoice._id || dn.invoice;
            console.log('[Edit Delivery Note] Fetching linked invoice:', invoiceId);
            const invoiceResponse = await invoicesApi.getById(invoiceId);
            if (invoiceResponse.success && invoiceResponse.data) {
              invoiceData = invoiceResponse.data as any;
              console.log('[Edit Delivery Note] Invoice data:', invoiceData);
            }
          } catch (err) {
            console.error('[Edit Delivery Note] Failed to fetch invoice:', err);
          }
        }
        
        setFormData({
          invoice: dn.invoice?._id || dn.invoice || '',
          client: dn.client?._id || '',
          deliveryDate: dn.deliveryDate ? dn.deliveryDate.split('T')[0] : '',
          deliveredBy: dn.deliveredBy || '',
          vehicle: dn.vehicle || '',
          deliveryAddress: dn.deliveryAddress || '',
          carrier: dn.carrier || '',
          trackingNumber: dn.trackingNumber || '',
          notes: dn.notes || '',
          lines: dn.lines ? dn.lines.map((line: any) => {
            // Find the matching invoice line to get ordered quantity
            const invoiceLine = invoiceData?.lines?.find((il: any) => 
              il._id === (line.invoiceLineId?._id || line.invoiceLineId) ||
              il.lineId === (line.invoiceLineId?._id || line.invoiceLineId)
            );
            
            const qtyOrdered = invoiceLine 
              ? (parseFloat(invoiceLine.qty) || parseFloat(invoiceLine.quantity) || 0)
              : (line.qtyOrdered || line.orderedQty || 0);
            
            const qtyDelivered = line.qtyDelivered || line.deliveredQty || 0;
            const qtyToDeliver = line.deliveredQty || line.qtyToDeliver || 0;
            
            console.log('[Edit Delivery Note] Processing line:', {
              lineId: line._id,
              invoiceLineId: line.invoiceLineId?._id || line.invoiceLineId,
              productName: line.product?.name || line.productName,
              qtyOrdered,
              qtyDelivered,
              qtyToDeliver,
              invoiceLineFound: !!invoiceLine
            });
            
            return {
              _id: line._id,
              invoiceLineId: line.invoiceLineId?._id || line.invoiceLineId || '',
              product: line.product?._id || line.product || '',
              productName: line.product?.name || line.productName || '',
              productSku: line.product?.sku || line.productSku || '',
              qtyOrdered,
              qtyDelivered,
              qtyToDeliver,
              unitPrice: parseFloat(line.unitPrice) || 0,
              lineTotal: parseFloat(line.lineTotal) || (qtyToDeliver * parseFloat(line.unitPrice || 0)),
              trackBatches: line.product?.trackBatches,
              trackSerials: line.product?.trackSerials,
            };
          }) : [],
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
        product: line.product?._id || (typeof line.product === 'string' ? line.product : ''),
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
          <h1 className="text-2xl font-bold dark:text-white">
            {isEditMode ? t('deliveryNote.editDeliveryNote', 'Edit Delivery Note') : t('deliveryNote.newDeliveryNote', 'New Delivery Note')}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">{t('deliveryNote.basicInfo', 'Basic Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="dark:text-gray-200">{t('deliveryNote.invoice', 'Invoice')} *</Label>
                  <Select 
                    value={formData.invoice} 
                    onValueChange={(value) => handleInvoiceChange(value)}
                    disabled={isEditMode || !!invoiceId}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                      <SelectValue placeholder={t('deliveryNote.selectInvoice', 'Select Invoice')} />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                      {invoices.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No invoices available
                        </div>
                      ) : (
                        invoices.map(inv => (
                          <SelectItem key={inv._id} value={inv._id} className="dark:text-white">
                            {inv.referenceNo || inv.invoiceNumber} - {inv.client?.name || 'No client'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="dark:text-gray-200">Warehouse *</Label>
                  <Select 
                    value={warehouse} 
                    onValueChange={(value) => setWarehouse(value)}
                    disabled={isEditMode}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                      {warehouses.map(wh => (
                        <SelectItem key={wh._id} value={wh._id} className="dark:text-white">
                          {wh.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="dark:text-gray-200">{t('deliveryNote.client', 'Client')}</Label>
                    <Input className="dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.client ? clients.find(c => c._id === formData.client)?.name || '' : ''} disabled />
                  </div>
                  <div>
                    <Label className="dark:text-gray-200">{t('deliveryNote.deliveryDate', 'Delivery Date')}</Label>
                    <Input
                      type="date"
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="dark:text-gray-200">{t('deliveryNote.deliveredBy', 'Delivered By')}</Label>
                    <Input
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.deliveredBy}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliveredBy: e.target.value }))}
                      placeholder={t('deliveryNote.deliveredByPlaceholder', 'Driver name')}
                    />
                  </div>
                  <div>
                    <Label className="dark:text-gray-200">{t('deliveryNote.vehicle', 'Vehicle')}</Label>
                    <Input
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.vehicle}
                      onChange={(e) => setFormData(prev => ({ ...prev, vehicle: e.target.value }))}
                      placeholder={t('deliveryNote.vehiclePlaceholder', 'Vehicle plate number')}
                    />
                  </div>
                </div>

                <div>
                  <Label className="dark:text-gray-200">{t('deliveryNote.deliveryAddress', 'Delivery Address')}</Label>
                  <Textarea
                    className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    placeholder={t('deliveryNote.deliveryAddressPlaceholder', 'Delivery address')}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="dark:text-gray-200">{t('deliveryNote.carrier', 'Carrier')}</Label>
                    <Input
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.carrier}
                      onChange={(e) => setFormData(prev => ({ ...prev, carrier: e.target.value }))}
                      placeholder={t('deliveryNote.carrierPlaceholder', 'Carrier name')}
                    />
                  </div>
                  <div>
                    <Label className="dark:text-gray-200">{t('deliveryNote.trackingNumber', 'Tracking Number')}</Label>
                    <Input
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.trackingNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                      placeholder={t('deliveryNote.trackingNumberPlaceholder', 'Tracking number')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">{t('deliveryNote.lineItems', 'Line Items')}</CardTitle>
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
                      <TableRow className="dark:hover:bg-slate-700">
                        <TableHead className="dark:text-gray-300">{t('deliveryNote.product', 'Product')}</TableHead>
                        <TableHead className="text-right dark:text-gray-300">{t('deliveryNote.qtyOrdered', 'Qty Ordered')}</TableHead>
                        <TableHead className="text-right dark:text-gray-300">{t('deliveryNote.qtyDelivered', 'Delivered')}</TableHead>
                        <TableHead className="text-right dark:text-gray-300">{t('deliveryNote.qtyToDeliver', 'To Deliver')}</TableHead>
                        <TableHead className="dark:text-gray-300">{t('deliveryNote.batch', 'Batch')}</TableHead>
                        <TableHead className="text-right dark:text-gray-300">{t('deliveryNote.unitPrice', 'Unit Price')}</TableHead>
                        <TableHead className="text-right dark:text-gray-300">{t('deliveryNote.total', 'Total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.lines.map((line, index) => (
                        <TableRow key={index} className="dark:hover:bg-slate-700">
                          <TableCell>
                            <div className="font-medium dark:text-white">{line.productName}</div>
                            <div className="text-sm text-muted-foreground">{line.productSku}</div>
                          </TableCell>
                          <TableCell className="text-right dark:text-white">{line.qtyOrdered}</TableCell>
                          <TableCell className="text-right dark:text-white">{line.qtyDelivered}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={line.qtyOrdered - line.qtyDelivered}
                              value={line.qtyToDeliver}
                              onChange={(e) => handleLineChange(index, 'qtyToDeliver', e.target.value)}
                              className="w-20 text-right dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              disabled={line.qtyOrdered - line.qtyDelivered === 0}
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                              Max: {line.qtyOrdered - line.qtyDelivered}
                            </div>
                          </TableCell>
                          <TableCell>
                            {line.trackBatches && (
                              <BatchAutocomplete
                                productId={line.product}
                                warehouseId={warehouse}
                                value={line.batchId}
                                onChange={(value) => handleLineChange(index, 'batchId', value)}
                                disabled={!warehouse || !line.product || line.qtyToDeliver === 0}
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-right dark:text-white">{formatCurrency(line.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium dark:text-white">
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
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">{t('deliveryNote.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between dark:text-white">
                  <span>{t('deliveryNote.itemsToDeliver', 'Items to Deliver')}</span>
                  <span>{formData.lines.filter(l => l.qtyToDeliver > 0).length}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t dark:text-white">
                  <span>{t('deliveryNote.total', 'Total')}</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">{t('deliveryNote.notes', 'Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
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