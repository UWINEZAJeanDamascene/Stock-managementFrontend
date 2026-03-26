import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { purchaseReturnsApi, grnApi, suppliersApi, warehousesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle,
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

interface GRN {
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
  status: string;
  lines: Array<{
    _id: string;
    product: {
      _id: string;
      name: string;
      sku: string;
    };
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

interface ReturnLine {
  grnLine: string;
  product: string;
  productName?: string;
  productSku?: string;
  qtyReceived: number;
  qtyPreviouslyReturned: number;
  qtyToReturn: number;
  unitCost: number;
}

export default function PurchaseReturnCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  const [selectedGRNId, setSelectedGRNId] = useState<string>('');
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<string>('');
  const [supplierCreditNoteNo, setSupplierCreditNoteNo] = useState<string>('');
  
  const [lines, setLines] = useState<ReturnLine[]>([]);

  const fetchGRNs = useCallback(async () => {
    try {
      console.log('[PurchaseReturnCreatePage] Fetching confirmed GRNs...');
      const response = await grnApi.getAll({ status: 'confirmed', limit: 100 });
      console.log('[PurchaseReturnCreatePage] GRNs response:', response);
      
      if (response.success && response.data) {
        const grnData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as unknown[]);
        setGrns(grnData as GRN[]);
      }
    } catch (error) {
      console.error('[PurchaseReturnCreatePage] Failed to fetch GRNs:', error);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      console.log('[PurchaseReturnCreatePage] Fetching warehouses...');
      const response = await warehousesApi.getAll({ limit: 100 });
      console.log('[PurchaseReturnCreatePage] Warehouses response:', response);
      
      if (response.success && response.data) {
        const warehouseData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as unknown[]);
        setWarehouses(warehouseData as Warehouse[]);
      }
    } catch (error) {
      console.error('[PurchaseReturnCreatePage] Error fetching warehouses:', error);
    }
  }, []);

  useEffect(() => {
    fetchGRNs();
    fetchWarehouses();
  }, [fetchGRNs, fetchWarehouses]);

  // When GRN is selected, fetch its details and populate lines
  const handleGRNSelect = async (grnId: string) => {
    setSelectedGRNId(grnId);
    if (!grnId) {
      setSelectedGRN(null);
      setLines([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await grnApi.getById(grnId);
      if (response.success) {
        const grn = response.data as GRN;
        setSelectedGRN(grn);
        setWarehouseId(grn.warehouse?._id || '');
        
        // Convert GRN lines to return lines
        const returnLines: ReturnLine[] = grn.lines.map((line: any) => ({
          grnLine: line._id,
          product: line.product._id,
          productName: line.product.name,
          productSku: line.product.sku,
          qtyReceived: line.qtyReceived,
          qtyPreviouslyReturned: 0, // Would need to calculate from existing PRs
          qtyToReturn: 0, // Default to 0, user enters
          unitCost: line.unitCost
        }));
        setLines(returnLines);
      }
    } catch (error) {
      console.error('Failed to fetch GRN details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLineChange = (index: number, qtyToReturn: number) => {
    const newLines = [...lines];
    const availableQty = newLines[index].qtyReceived - newLines[index].qtyPreviouslyReturned;
    // Cannot exceed available qty
    newLines[index].qtyToReturn = Math.max(0, Math.min(qtyToReturn, availableQty));
    setLines(newLines);
  };

  const calculateSubtotal = () => {
    return lines.reduce((sum, line) => sum + (line.qtyToReturn * line.unitCost), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const handleSave = async (confirmImmediately: boolean = false) => {
    if (!selectedGRNId || !warehouseId || !reason) {
      return;
    }

    setSaving(true);
    try {
      // Filter out lines with 0 qty to return
      const validLines = lines.filter(line => line.qtyToReturn > 0).map(line => ({
        grnLine: line.grnLine,
        product: line.product,
        qtyReturned: line.qtyToReturn,
        unitCost: line.unitCost
      }));

      if (validLines.length === 0) {
        alert('Please enter at least one qty to return');
        setSaving(false);
        return;
      }

      if (!reason.trim()) {
        alert('Please enter a reason for the return');
        setSaving(false);
        return;
      }

      const returnData = {
        referenceNo: referenceNo || `PRN-${Date.now()}`,
        grn: selectedGRNId,
        supplier: selectedGRN?.supplier?._id,
        warehouse: warehouseId,
        returnDate,
        reason,
        supplierCreditNoteNo: supplierCreditNoteNo || undefined,
        lines: validLines
      };

      console.log('[PurchaseReturnCreatePage] Creating return with data:', returnData);
      
      const response = await purchaseReturnsApi.create(returnData as any);
      console.log('[PurchaseReturnCreatePage] Create response:', response);
      
      if (response.success && response.data) {
        // If confirmImmediately is true, confirm the return
        const returnId = (response.data as { _id: string })._id;
        if (confirmImmediately && returnId) {
          console.log('[PurchaseReturnCreatePage] Confirming return:', returnId);
          await purchaseReturnsApi.confirm(returnId);
        }
        navigate('/purchase-returns');
      }
    } catch (error) {
      console.error('[PurchaseReturnCreatePage] Failed to create return:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/purchase-returns')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold">{t('purchaseReturn.create', 'Create Purchase Return')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* GRN Selection */}
            <Card>
              <CardHeader>
                <CardTitle>{t('purchaseReturn.selectGRN', 'Select GRN')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedGRNId} onValueChange={handleGRNSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('purchaseReturn.selectGRNPlaceholder', 'Select a confirmed GRN...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {grns.map((grn) => (
                      <SelectItem key={grn._id} value={grn._id}>
                        {grn.referenceNo} - {grn.supplier?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Line Items */}
            {selectedGRN && lines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('purchaseReturn.lineItems', 'Line Items')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('purchaseReturn.product', 'Product')}</TableHead>
                        <TableHead className="text-right">{t('purchaseReturn.qtyReceived', 'Qty Received')}</TableHead>
                        <TableHead className="text-right">{t('purchaseReturn.alreadyReturned', 'Already Returned')}</TableHead>
                        <TableHead className="text-right">{t('purchaseReturn.available', 'Available')}</TableHead>
                        <TableHead className="text-right">{t('purchaseReturn.qtyToReturn', 'Qty to Return')}</TableHead>
                        <TableHead className="text-right">{t('purchaseReturn.unitCost', 'Unit Cost')}</TableHead>
                        <TableHead className="text-right">{t('purchaseReturn.lineTotal', 'Total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, index) => {
                        const availableQty = line.qtyReceived - line.qtyPreviouslyReturned;
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="font-medium">{line.productName}</div>
                              <div className="text-sm text-muted-foreground">{line.productSku}</div>
                            </TableCell>
                            <TableCell className="text-right">{line.qtyReceived}</TableCell>
                            <TableCell className="text-right">{line.qtyPreviouslyReturned}</TableCell>
                            <TableCell className="text-right">{availableQty}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                max={availableQty}
                                value={line.qtyToReturn}
                                onChange={(e) => handleLineChange(index, parseFloat(e.target.value) || 0)}
                                className="w-20 text-right"
                                disabled={availableQty <= 0}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {line.unitCost.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {(line.qtyToReturn * line.unitCost).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Return Details */}
            <Card>
              <CardHeader>
                <CardTitle>{t('purchaseReturn.details', 'Return Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('purchaseReturn.referenceNo', 'Reference No')}</Label>
                  <Input 
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder={t('purchaseReturn.autoGenerate', 'Auto-generate if empty')}
                  />
                </div>
                <div>
                  <Label>{t('purchaseReturn.warehouse', 'Warehouse')}</Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('purchaseReturn.selectWarehouse', 'Select warehouse')} />
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
                  <Label>{t('purchaseReturn.returnDate', 'Return Date')}</Label>
                  <Input 
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('purchaseReturn.reason', 'Reason')} *</Label>
                  <Textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t('purchaseReturn.reasonPlaceholder', 'Enter reason for return...')}
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <Label>{t('purchaseReturn.supplierCreditNote', 'Supplier Credit Note No')}</Label>
                  <Input 
                    value={supplierCreditNoteNo}
                    onChange={(e) => setSupplierCreditNoteNo(e.target.value)}
                    placeholder={t('purchaseReturn.supplierCreditNotePlaceholder', 'Enter credit note number (optional)')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>{t('purchaseReturn.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('purchaseReturn.subtotal', 'Subtotal')}</span>
                    <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>{t('purchaseReturn.total', 'Total')}</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => handleSave(false)}
                disabled={saving || !selectedGRNId || lines.filter(l => l.qtyToReturn > 0).length === 0 || !reason.trim()}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('purchaseReturn.saveAsDraft', 'Save as Draft')}
              </Button>
              <Button 
                variant="default"
                onClick={() => handleSave(true)}
                disabled={saving || !selectedGRNId || lines.filter(l => l.qtyToReturn > 0).length === 0 || !reason.trim()}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {t('purchaseReturn.saveAndConfirm', 'Save & Confirm')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}