import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { purchaseOrdersApi, grnApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  Package,
  FileText,
  Clock,
  Loader2,
  Plus,
  Truck
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import { useTranslation } from 'react-i18next';

interface PurchaseOrder {
  _id: string;
  referenceNo: string;
  supplier: {
    _id: string;
    name: string;
    code?: string;
    contact?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  warehouse?: {
    _id: string;
    name: string;
    code?: string;
  };
  orderDate: string;
  expectedDeliveryDate?: string;
  status: 'draft' | 'approved' | 'partially_received' | 'fully_received' | 'cancelled';
  currencyCode: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  createdBy?: {
    name: string;
    email: string;
  };
  approvedBy?: {
    name: string;
    email: string;
  };
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
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
    taxAmount: number;
    lineTotal: number;
  }>;
}

interface GRN {
  _id: string;
  referenceNo: string;
  receivedDate: string;
  status: string;
  totalAmount: number;
  createdBy?: {
    name: string;
    email: string;
  };
  confirmedBy?: {
    name: string;
    email: string;
  };
  confirmedAt?: string;
}

const STATUS_FLOW = [
  { status: 'draft', label: 'Draft' },
  { status: 'approved', label: 'Approved' },
  { status: 'partially_received', label: 'Partially Received' },
  { status: 'fully_received', label: 'Fully Received' },
];

export default function PurchaseOrderDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [grns, setGrns] = useState<GRN[]>([]);

  const fetchPurchaseOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await purchaseOrdersApi.getById(id);
      if (response.success) {
        setPurchaseOrder(response.data as PurchaseOrder);
        setGrns(response.grns as GRN[] || []);
      }
    } catch (error) {
      console.error('Failed to fetch purchase order:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPurchaseOrder();
  }, [fetchPurchaseOrder]);

  const handleApprove = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await purchaseOrdersApi.approve(id);
      fetchPurchaseOrder();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await purchaseOrdersApi.cancel(id);
      fetchPurchaseOrder();
    } catch (error) {
      console.error('Failed to cancel:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: t('purchase.status.draft', 'Draft') },
      approved: { variant: 'default', label: t('purchase.status.approved', 'Approved') },
      partially_received: { variant: 'outline', label: t('purchase.status.partially_received', 'Partial') },
      fully_received: { variant: 'default', label: t('purchase.status.fully_received', 'Received') },
      cancelled: { variant: 'destructive', label: t('purchase.status.cancelled', 'Cancelled') },
    };
    
    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusStep = (status: string) => {
    const stepIndex = STATUS_FLOW.findIndex(s => s.status === status);
    if (status === 'cancelled') return -1;
    return stepIndex;
  };

  const formatCurrency = (amount: number | string, currency: string = 'USD') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
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

  if (!purchaseOrder) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <p>Purchase order not found</p>
        </div>
      </Layout>
    );
  }

  const currentStatusStep = getStatusStep(purchaseOrder.status);

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/purchase-orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
        </div>

        {/* Document Header */}
        <div className="bg-card rounded-lg border p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">
                  {purchaseOrder.referenceNo || 'N/A'}
                </h1>
                {getStatusBadge(purchaseOrder.status)}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('purchase.detail.supplier', 'Supplier')}</p>
                  <p className="font-medium">{purchaseOrder.supplier?.name || '-'}</p>
                  {purchaseOrder.supplier?.contact && <p className="text-muted-foreground">{purchaseOrder.supplier.contact}</p>}
                  {purchaseOrder.supplier?.email && <p className="text-muted-foreground">{purchaseOrder.supplier.email}</p>}
                  {purchaseOrder.supplier?.phone && <p className="text-muted-foreground">{purchaseOrder.supplier.phone}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground">{t('purchase.detail.warehouse', 'Warehouse')}</p>
                  <p className="font-medium">{purchaseOrder.warehouse?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('purchase.detail.orderDate', 'Order Date')}</p>
                  <p className="font-medium">{formatDate(purchaseOrder.orderDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('purchase.detail.expectedDelivery', 'Expected Delivery')}</p>
                  <p className="font-medium">{purchaseOrder.expectedDeliveryDate ? formatDate(purchaseOrder.expectedDeliveryDate) : '-'}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-sm">{t('purchase.detail.total', 'Total Amount')}</p>
              <p className="text-2xl font-bold">
                {formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currencyCode)}
              </p>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-medium mb-3">{t('purchase.detail.statusTimeline', 'Status Timeline')}</p>
            <div className="flex items-center gap-2">
              {STATUS_FLOW.map((step, index) => (
                <div key={step.status} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
                    index <= currentStatusStep 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index < currentStatusStep ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : index === currentStatusStep ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                    <span className="text-sm">{step.label}</span>
                  </div>
                  {index < STATUS_FLOW.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      index < currentStatusStep ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
              {purchaseOrder.status === 'cancelled' && (
                <Badge variant="destructive" className="ml-4">
                  {t('purchase.status.cancelled', 'Cancelled')}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t flex gap-2">
            {purchaseOrder.status === 'draft' && (
              <>
                <Button onClick={handleApprove} disabled={actionLoading}>
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  {t('purchase.detail.approve', 'Approve')}
                </Button>
                <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('purchase.detail.cancel', 'Cancel')}
                </Button>
              </>
            )}
            {purchaseOrder.status === 'approved' && (
              <Button onClick={() => navigate('/grn/new', { state: { purchaseOrderId: id } })}>
                <Package className="mr-2 h-4 w-4" />
                {t('purchase.detail.createGRN', 'Create GRN')}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">{t('purchase.detail.tabs.details', 'Details')}</TabsTrigger>
            <TabsTrigger value="grns">
              {t('purchase.detail.tabs.grns', 'GRNs')} 
              {grns.length > 0 && <Badge variant="secondary" className="ml-2">{grns.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history">{t('purchase.detail.tabs.history', 'History')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('purchase.detail.lineItems', 'Line Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('purchase.detail.product', 'Product')}</TableHead>
                      <TableHead className="text-right">{t('purchase.detail.qtyOrdered', 'Qty Ordered')}</TableHead>
                      <TableHead className="text-right">{t('purchase.detail.qtyReceived', 'Qty Received')}</TableHead>
                      <TableHead className="text-right">{t('purchase.detail.unitCost', 'Unit Cost')}</TableHead>
                      <TableHead className="text-right">{t('purchase.detail.tax', 'Tax')}</TableHead>
                      <TableHead className="text-right">{t('purchase.detail.total', 'Total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrder.lines?.map((line) => (
                      <TableRow key={line._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{line.product?.name || '-'}</p>
                            <p className="text-sm text-muted-foreground">{line.product?.sku || ''}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{line.qtyOrdered}</TableCell>
                        <TableCell className="text-right">{line.qtyReceived || 0}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.unitCost, purchaseOrder.currencyCode)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.taxAmount, purchaseOrder.currencyCode)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(line.lineTotal, purchaseOrder.currencyCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Summary */}
                <div className="mt-4 pt-4 border-t flex justify-end gap-8">
                  <div className="text-right">
                    <p className="text-muted-foreground">{t('purchase.detail.subtotal', 'Subtotal')}</p>
                    <p className="font-medium">{formatCurrency(purchaseOrder.subtotal, purchaseOrder.currencyCode)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">{t('purchase.detail.tax', 'Tax')}</p>
                    <p className="font-medium">{formatCurrency(purchaseOrder.taxAmount, purchaseOrder.currencyCode)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{t('purchase.detail.total', 'Total')}</p>
                    <p className="font-bold text-lg">{formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currencyCode)}</p>
                  </div>
                </div>

                {/* Notes */}
                {purchaseOrder.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-muted-foreground text-sm">{t('purchase.detail.notes', 'Notes')}</p>
                    <p>{purchaseOrder.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grns" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('purchase.detail.grnList', 'Goods Received Notes')}</CardTitle>
                {purchaseOrder.status === 'approved' && (
                  <Button size="sm" onClick={() => navigate('/grn/new', { state: { purchaseOrderId: id } })}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('purchase.detail.createGRN', 'Create GRN')}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {grns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('purchase.detail.noGRNs', 'No GRNs found for this purchase order')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('purchase.detail.grnRef', 'GRN Reference')}</TableHead>
                        <TableHead>{t('purchase.detail.receivedDate', 'Received Date')}</TableHead>
                        <TableHead>{t('purchase.detail.status', 'Status')}</TableHead>
                        <TableHead className="text-right">{t('purchase.detail.amount', 'Amount')}</TableHead>
                        <TableHead>{t('purchase.detail.confirmedBy', 'Confirmed By')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grns.map((grn) => (
                        <TableRow key={grn._id}>
                          <TableCell className="font-medium">{grn.referenceNo}</TableCell>
                          <TableCell>{formatDate(grn.receivedDate)}</TableCell>
                          <TableCell>
                            <Badge variant={grn.status === 'confirmed' ? 'default' : 'secondary'}>
                              {grn.status === 'confirmed' ? t('purchase.grn.confirmed', 'Confirmed') : t('purchase.grn.draft', 'Draft')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(grn.totalAmount, purchaseOrder.currencyCode)}</TableCell>
                          <TableCell>
                            {grn.confirmedBy?.name || '-'}
                            {grn.confirmedAt && <span className="text-muted-foreground text-sm ml-2">{formatDate(grn.confirmedAt)}</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('purchase.detail.historyTitle', 'Activity History')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="font-medium">{t('purchase.history.created', 'Purchase Order Created')}</p>
                      <p className="text-sm text-muted-foreground">
                        {purchaseOrder.createdBy?.name || 'Unknown'} - {formatDate(purchaseOrder.createdAt)}
                      </p>
                    </div>
                  </div>
                  {purchaseOrder.approvedAt && (
                    <div className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div>
                        <p className="font-medium">{t('purchase.history.approved', 'Purchase Order Approved')}</p>
                        <p className="text-sm text-muted-foreground">
                          {purchaseOrder.approvedBy?.name || 'Unknown'} - {formatDate(purchaseOrder.approvedAt)}
                        </p>
                      </div>
                    </div>
                  )}
                  {purchaseOrder.status === 'partially_received' && (
                    <div className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
                      <div>
                        <p className="font-medium">{t('purchase.history.partialReceived', 'Partially Received')}</p>
                      </div>
                    </div>
                  )}
                  {purchaseOrder.status === 'fully_received' && (
                    <div className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div>
                        <p className="font-medium">{t('purchase.history.fullyReceived', 'Fully Received')}</p>
                      </div>
                    </div>
                  )}
                  {purchaseOrder.status === 'cancelled' && (
                    <div className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                      <div>
                        <p className="font-medium">{t('purchase.history.cancelled', 'Purchase Order Cancelled')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}