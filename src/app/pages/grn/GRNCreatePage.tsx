import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { grnApi, purchaseOrdersApi, warehousesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle,
  Package,
  Loader2
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
  TableRow 
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

interface PurchaseOrder {
  _id: string;
  referenceNo: string;
  supplier: {
    _id: string;
    name: string;
  };
  warehouse: {
    _id: string;
    name: string;
  };
  lines: Array<{
    _id: string;
    product: {
      _id: string;
      name: string;
      sku: string;
      unit?: string;
    };
    qtyOrdered: number;
    qtyReceived: number;
    unitCost: number;
    taxRate: number;
  }>;
}

interface Warehouse {
  _id: string;
  name: string;
  code?: string;
}

interface GRNLine {
  product: string;
  productName?: string;
  productSku?: string;
  qtyOrdered: number;
  qtyReceived: number;
  qtyPreviouslyReceived: number;
  unitCost: number;
  taxRate: number;
  purchaseOrderLine: string;
}

export default function GRNCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const state = location.state as { purchaseOrderId?: string } | null;
  const initialPOId = state?.purchaseOrderId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  const [selectedPOId, setSelectedPOId] = useState<string>(initialPOId || '');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [lines, setLines] = useState<GRNLine[]>([]);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      console.log('[GRNCreatePage] Fetching purchase orders...');
      const response = await purchaseOrdersApi.getAll({ status: 'approved', limit: 50 });
      const responsePartial = await purchaseOrdersApi.getAll({ status: 'partially_received', limit: 50 });
      console.log('[GRNCreatePage] POs response:', response, responsePartial);
      
      const poList: PurchaseOrder[] = [];
      if (response.success && response.data) {
        const poData = Array.isArray(response.data) ? response.data : [];
        poList.push(...(poData as PurchaseOrder[]));
      }
      if (responsePartial.success && responsePartial.data) {
        const poData = Array.isArray(responsePartial.data) ? responsePartial.data : [];
        poList.push(...(poData as PurchaseOrder[]));
      }
      setPurchaseOrders(poList);
    } catch (error) {
      console.error('[GRNCreatePage] Error fetching POs:', error);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      console.log('[GRNCreatePage] Fetching warehouses...');
      const response = await warehousesApi.getAll({ limit: 100 });
      console.log('[GRNCreatePage] Warehouses response:', response);
      
      if (response.success && response.data) {
        // Handle both array and object response formats
        const warehouseData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as unknown[]);
        setWarehouses(warehouseData as Warehouse[]);
      } else {
        console.error('[GRNCreatePage] Failed to fetch warehouses:', response);
      }
    } catch (error) {
      console.error('[GRNCreatePage] Error fetching warehouses:', error);
    }
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchWarehouses();
  }, [fetchPurchaseOrders, fetchWarehouses]);

  // When PO is selected, fetch its details and populate lines
  const handlePOSelect = async (poId: string) => {
    setSelectedPOId(poId);
    if (!poId) {
      setSelectedPO(null);
      setLines([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await purchaseOrdersApi.getById(poId);
      if (response.success) {
        const po = response.data as PurchaseOrder;
        setSelectedPO(po);
        setWarehouseId(po.warehouse?._id || '');
        
        // Convert PO lines to GRN lines, calculating remaining qty
        const grnLines: GRNLine[] = po.lines.map((line: any) => ({
          product: line.product._id,
          productName: line.product.name,
          productSku: line.product.sku,
          qtyOrdered: line.qtyOrdered,
          qtyReceived: 0, // Default to 0, user enters
          qtyPreviouslyReceived: line.qtyReceived || 0,
          unitCost: line.unitCost,
          taxRate: line.taxRate || 0,
          purchaseOrderLine: line._id
        }));
        setLines(grnLines);
      }
    } catch (error) {
      console.error('Failed to fetch PO details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    
    if (field === 'qtyReceived') {
      const numValue = parseFloat(value) || 0;
      const remainingQty = newLines[index].qtyOrdered - newLines[index].qtyPreviouslyReceived;
      // Cannot exceed remaining qty
      newLines[index].qtyReceived = Math.min(numValue, remainingQty);
    } else {
      (newLines[index] as any)[field] = value;
    }
    
    setLines(newLines);
  };

  const calculateSubtotal = () => {
    return lines.reduce((sum, line) => sum + (line.qtyReceived * line.unitCost), 0);
  };

  const calculateTax = () => {
    return lines.reduce((sum, line) => {
      const lineTotal = line.qtyReceived * line.unitCost;
      return sum + (lineTotal * (line.taxRate / 100));
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSave = async (confirmImmediately: boolean = false) => {
    if (!selectedPOId || !warehouseId || lines.length === 0) {
      return;
    }

    setSaving(true);
    try {
      // Filter out lines with 0 qty received
      const validLines = lines.filter(line => line.qtyReceived > 0).map(line => ({
        product: line.product,
        qtyReceived: line.qtyReceived,
        unitCost: line.unitCost,
        purchaseOrderLine: line.purchaseOrderLine,
        batchNo: undefined as string | undefined,
        serialNumbers: undefined as string[] | undefined
      }));

      if (validLines.length === 0) {
        alert('Please enter at least one qty received');
        setSaving(false);
        return;
      }

      const grnData = {
        purchaseOrderId: selectedPOId,
        warehouse: warehouseId,
        referenceNo: referenceNo || `GRN-${Date.now()}`,
        supplierInvoiceNo: supplierInvoiceNo || undefined,
        receivedDate: receivedDate || undefined,
        lines: validLines
      };

      const response = await grnApi.create(grnData as any);
      
      if (response.success && response.data) {
        // If confirmImmediately is true, confirm the GRN
        const grnResponse = response.data as { _id: string };
        const grnId = grnResponse._id;
        if (confirmImmediately && grnId) {
          await grnApi.confirm(grnId);
        }
        navigate('/grn');
      }
    } catch (error) {
      console.error('Failed to create GRN:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/grn')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold">{t('grn.create', 'Create GRN')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* PO Selection */}
            <Card>
              <CardHeader>
                <CardTitle>{t('grn.selectPO', 'Select Purchase Order')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedPOId || undefined} onValueChange={handlePOSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={purchaseOrders.length === 0 ? 'No approved POs available' : t('grn.selectPOPlaceholder', 'Select a purchase order...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po._id} value={po._id}>
                        {po.referenceNo} - {po.supplier?.name || 'N/A'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Line Items */}
            {selectedPO && lines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('grn.lineItems', 'Line Items')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('grn.product', 'Product')}</TableHead>
                        <TableHead className="text-right">{t('grn.qtyOrdered', 'Qty Ordered')}</TableHead>
                        <TableHead className="text-right">{t('grn.qtyReceived', 'Qty Received')}</TableHead>
                        <TableHead className="text-right">{t('grn.remaining', 'Remaining')}</TableHead>
                        <TableHead className="text-right">{t('grn.unitCost', 'Unit Cost')}</TableHead>
                        <TableHead className="text-right">{t('grn.lineTotal', 'Total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="font-medium">{line.productName}</div>
                            <div className="text-sm text-muted-foreground">{line.productSku}</div>
                          </TableCell>
                          <TableCell className="text-right">{line.qtyOrdered}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              max={line.qtyOrdered - line.qtyPreviouslyReceived}
                              value={line.qtyReceived}
                              onChange={(e) => handleLineChange(index, 'qtyReceived', e.target.value)}
                              className="w-20 text-right"
                              disabled={line.qtyOrdered - line.qtyPreviouslyReceived <= 0}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {line.qtyOrdered - line.qtyPreviouslyReceived}
                          </TableCell>
                          <TableCell className="text-right">
                            {line.unitCost.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {(line.qtyReceived * line.unitCost).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* GRN Details */}
            <Card>
              <CardHeader>
                <CardTitle>{t('grn.details', 'GRN Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('grn.referenceNo', 'Reference No')}</Label>
                  <Input 
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder={t('grn.autoGenerate', 'Auto-generate if empty')}
                  />
                </div>
                <div>
                  <Label>{t('grn.warehouse', 'Warehouse')}</Label>
                  <Select value={warehouseId || undefined} onValueChange={setWarehouseId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('grn.selectWarehouse', 'Select warehouse')} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh._id} value={wh._id}>
                          {wh.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('grn.receivedDate', 'Received Date')}</Label>
                  <Input 
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('grn.supplierInvoiceNo', 'Supplier Invoice No')}</Label>
                  <Input 
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    placeholder={t('grn.supplierInvoicePlaceholder', 'Enter invoice number')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>{t('grn.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('grn.subtotal', 'Subtotal')}</span>
                    <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('grn.tax', 'Tax')}</span>
                    <span className="font-medium">${calculateTax().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>{t('grn.total', 'Total')}</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => handleSave(false)}
                disabled={saving || !selectedPOId || lines.filter(l => l.qtyReceived > 0).length === 0}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('grn.saveAsDraft', 'Save as Draft')}
              </Button>
              <Button 
                variant="default"
                onClick={() => handleSave(true)}
                disabled={saving || !selectedPOId || lines.filter(l => l.qtyReceived > 0).length === 0}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {t('grn.saveAndConfirm', 'Save & Confirm')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}