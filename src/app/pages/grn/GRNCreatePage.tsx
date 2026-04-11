import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { grnApi, purchaseOrdersApi, warehousesApi, productsApi } from '@/lib/api';
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
  trackingType?: 'none' | 'batch' | 'serial';
  batchNo?: string;
  manufactureDate?: string;
  expiryDate?: string;
  serialNumbers?: string[];
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
        
        // Convert PO lines to GRN lines, calculating remaining qty and tracking type
        // Also fetch product details directly to ensure we have trackingType
        const grnLines: GRNLine[] = await Promise.all(
          po.lines.map(async (line: any) => {
            let trackingType: 'none' | 'batch' | 'serial' = 'none';
            try {
              const productResponse = await productsApi.getById(line.product._id);
              if (productResponse.success) {
                const product = productResponse.data as any;
                trackingType = product.trackingType || 'none';
                console.log('[GRNCreatePage] Fetched product trackingType:', product.name, trackingType);
              }
            } catch (e) {
              console.error('[GRNCreatePage] Failed to fetch product:', line.product._id, e);
              trackingType = line.product?.trackingType || 'none';
            }
            
            return {
              product: line.product._id,
              productName: line.product.name,
              productSku: line.product.sku,
              qtyOrdered: line.qtyOrdered,
              qtyReceived: 0,
              qtyPreviouslyReceived: line.qtyReceived || 0,
              unitCost: line.unitCost,
              taxRate: line.taxRate || 0,
              purchaseOrderLine: line._id,
              trackingType: trackingType
            };
          })
        );
        setLines(grnLines);
      }
    } catch (error) {
      console.error('Failed to fetch PO details:', error);
    } finally {
      setLoading(false);
    }
  };

const parseSerialNumbers = (input: string): string[] => {
      if (!input || !input.trim()) return [];
      
      const results: string[] = [];
      const parts = input.split(',').map(p => p.trim()).filter(p => p);
      
      for (const part of parts) {
        if (part.includes('-')) {
          const rangeParts = part.split('-');
          if (rangeParts.length === 2) {
            const start = rangeParts[0].trim();
            const end = rangeParts[1].trim();
            
            const startMatch = start.match(/^([A-Za-z0-9]*?)(\d+)$/);
            const endMatch = end.match(/^([A-Za-z0-9]*?)(\d+)$/);
            
            if (startMatch && endMatch) {
              const alphaPrefix = startMatch[1];
              const startNum = parseInt(startMatch[2], 10);
              const endNum = parseInt(endMatch[2], 10);
              const numDigits = Math.max(startMatch[2].length, endMatch[2].length);
              
              for (let i = startNum; i <= endNum; i++) {
                const paddedNum = String(i).padStart(numDigits, '0');
                results.push(alphaPrefix + paddedNum);
              }
            }
          } else if (rangeParts.length > 2) {
            const start = rangeParts[0];
            const end = rangeParts[rangeParts.length - 1];
            
            const startMatch = start.match(/^([A-Za-z0-9]*?)(\d+)$/);
            const endMatch = end.match(/^([A-Za-z0-9]*?)(\d+)$/);
            
            if (startMatch && endMatch) {
              const alphaPrefix = startMatch[1];
              const startNum = parseInt(startMatch[2], 10);
              const endNum = parseInt(endMatch[2], 10);
              const numDigits = Math.max(startMatch[2].length, endMatch[2].length);
              
              for (let i = startNum; i <= endNum; i++) {
                const paddedNum = String(i).padStart(numDigits, '0');
                results.push(alphaPrefix + paddedNum);
              }
            }
          }
        } else {
          results.push(part);
        }
      }
      
      return results;
    };

    const handleLineChange = (index: number, field: string, value: any) => {
      const newLines = [...lines];
      
      if (field === 'qtyReceived') {
        const numValue = parseFloat(value) || 0;
        const remainingQty = newLines[index].qtyOrdered - newLines[index].qtyPreviouslyReceived;
        newLines[index].qtyReceived = Math.min(numValue, remainingQty);
      } else if (field === 'serialNumbers' && typeof value === 'string') {
        newLines[index].serialNumbers = parseSerialNumbers(value);
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

    if (confirmImmediately) {
      const linesWithBatch = lines.filter(line => line.trackingType === 'batch' && line.qtyReceived > 0);
      for (const line of linesWithBatch) {
        if (!line.batchNo || line.batchNo.trim() === '') {
          alert(`Batch number required for product ${line.productName || line.productSku || line.product}`);
          setSaving(false);
          return;
        }
      }
      const linesWithSerial = lines.filter(line => line.trackingType === 'serial' && line.qtyReceived > 0);
      for (const line of linesWithSerial) {
        const serialCount = line.serialNumbers?.length || 0;
        if (serialCount !== line.qtyReceived) {
          alert(`Serial numbers for ${line.productName || line.productSku || line.product}: entered ${serialCount}, need ${line.qtyReceived}. Use format: "SN001,SN002" or "SN001-SN${line.qtyReceived}"`);
          setSaving(false);
          return;
        }
      }
    }

    setSaving(true);
    try {
// Filter out lines with 0 qty received
        const validLines = lines.filter(line => line.qtyReceived > 0).map(line => ({
          product: line.product,
          qtyReceived: line.qtyReceived,
          unitCost: line.unitCost,
          purchaseOrderLine: line.purchaseOrderLine,
          batchNo: line.batchNo || undefined,
          manufactureDate: line.manufactureDate || undefined,
          expiryDate: line.expiryDate || undefined,
          serialNumbers: line.serialNumbers || undefined
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
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/grn')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('grn.create', 'Create GRN')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* PO Selection */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('grn.selectPO', 'Select Purchase Order')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedPOId || undefined} onValueChange={handlePOSelect}>
                  <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                    <SelectValue placeholder={purchaseOrders.length === 0 ? 'No approved POs available' : t('grn.selectPOPlaceholder', 'Select a purchase order...')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po._id} value={po._id} className="dark:text-slate-200">
                        {po.referenceNo} - {po.supplier?.name || 'N/A'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Line Items */}
            {selectedPO && lines.length > 0 && (
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">{t('grn.lineItems', 'Line Items')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700">
                        <TableHead className="dark:text-white">{t('grn.product', 'Product')}</TableHead>
                        <TableHead className="text-right dark:text-white">{t('grn.qtyOrdered', 'Qty Ordered')}</TableHead>
                        <TableHead className="text-right dark:text-white">{t('grn.qtyReceived', 'Qty Received')}</TableHead>
                        <TableHead className="text-right dark:text-white">{t('grn.remaining', 'Remaining')}</TableHead>
                        <TableHead className="text-right dark:text-white">{t('grn.unitCost', 'Unit Cost')}</TableHead>
                        <TableHead className="text-right dark:text-white">{t('grn.lineTotal', 'Total')}</TableHead>
                        {lines.some(line => line.trackingType === 'batch') && <TableHead className="dark:text-white">{t('grn.batchNo', 'Batch No')}</TableHead>}
                        {lines.some(line => line.trackingType === 'batch') && <TableHead className="dark:text-white">{t('grn.manufactureDate', 'Mnf. Date')}</TableHead>}
                        {lines.some(line => line.trackingType === 'batch') && <TableHead className="dark:text-white">{t('grn.expiryDate', 'Exp. Date')}</TableHead>}
                        {lines.some(line => line.trackingType === 'serial') && <TableHead className="dark:text-white">{t('grn.serialNumbers', 'Serial Numbers')}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, index) => (
                        <TableRow key={index} className="dark:hover:bg-slate-700/50">
                          <TableCell>
                            <div className="font-medium dark:text-slate-200">{line.productName}</div>
                            <div className="text-sm text-muted-foreground dark:text-slate-400">{line.productSku}</div>
                          </TableCell>
                          <TableCell className="text-right dark:text-slate-300">{line.qtyOrdered}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              max={line.qtyOrdered - line.qtyPreviouslyReceived}
                              value={line.qtyReceived}
                              onChange={(e) => handleLineChange(index, 'qtyReceived', e.target.value)}
                              className="w-20 text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                              disabled={line.qtyOrdered - line.qtyPreviouslyReceived <= 0}
                            />
                          </TableCell>
                        <TableCell className="text-right dark:text-slate-300">
                            {line.qtyOrdered - line.qtyPreviouslyReceived}
                        </TableCell>
                        <TableCell className="text-right dark:text-slate-300">
                            {line.unitCost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium dark:text-slate-200">
                            {(line.qtyReceived * line.unitCost).toFixed(2)}
                        </TableCell>
                        {line.trackingType === 'batch' && (
                          <>
                            <TableCell className="text-right">
                              <Input
                                type="text"
                                value={line.batchNo || ''}
                                onChange={(e) => handleLineChange(index, 'batchNo', e.target.value)}
                                placeholder="Batch No"
                                className="w-24 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="date"
                                value={line.manufactureDate || ''}
                                onChange={(e) => handleLineChange(index, 'manufactureDate', e.target.value)}
                                className="w-28 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="date"
                                value={line.expiryDate || ''}
                                onChange={(e) => handleLineChange(index, 'expiryDate', e.target.value)}
                                className="w-28 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                              />
                            </TableCell>
                          </>
                        )}
                        {line.trackingType === 'serial' && (
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <Input
                                type="text"
                                value={line.serialNumbers?.join(', ') || ''}
                                onChange={(e) => handleLineChange(index, 'serialNumbers', e.target.value)}
                                placeholder="SN001,SN002 or SN001-SN030"
                                className="w-36 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                              />
                              {line.qtyReceived > 0 && (
                                <span className="text-xs text-muted-foreground dark:text-slate-400">
                                  {line.serialNumbers?.length || 0} / {line.qtyReceived} entered
                                </span>
                              )}
                            </div>
                          </TableCell>
                        )}
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
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('grn.details', 'GRN Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-900 dark:text-white">{t('grn.referenceNo', 'Reference No')}</Label>
                  <Input 
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder={t('grn.autoGenerate', 'Auto-generate if empty')}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-white">{t('grn.warehouse', 'Warehouse')}</Label>
                  <Select value={warehouseId || undefined} onValueChange={setWarehouseId}>
                    <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                      <SelectValue placeholder={t('grn.selectWarehouse', 'Select warehouse')} />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      {warehouses.map((wh) => (
                        <SelectItem key={wh._id} value={wh._id} className="dark:text-slate-200">
                          {wh.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-white">{t('grn.receivedDate', 'Received Date')}</Label>
                  <Input 
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-white">{t('grn.supplierInvoiceNo', 'Supplier Invoice No')}</Label>
                  <Input 
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    placeholder={t('grn.supplierInvoicePlaceholder', 'Enter invoice number')}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('grn.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="dark:text-slate-300">{t('grn.subtotal', 'Subtotal')}</span>
                    <span className="font-medium dark:text-slate-200">${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="dark:text-slate-300">{t('grn.tax', 'Tax')}</span>
                    <span className="font-medium dark:text-slate-200">${calculateTax().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t dark:border-slate-600">
                    <span className="text-slate-900 dark:text-white">{t('grn.total', 'Total')}</span>
                    <span className="text-slate-900 dark:text-white">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => handleSave(false)}
                disabled={saving || !selectedPOId || lines.filter(l => l.qtyReceived > 0).length === 0}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
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