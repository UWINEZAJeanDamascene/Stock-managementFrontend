import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { purchaseOrdersApi, grnApi, bankAccountsApi } from '@/lib/api';
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
  Truck,
  CreditCard,
  DollarSign
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
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
  amountPaid?: number;
  balance?: number;
  paymentStatus?: string;
  payments?: Array<{
    amount: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    paidDate: string;
  }>;
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
    budgetId?: string | { _id: string; name: string; fiscalYear?: string };
    accountId?: string | { _id: string; code: string; name: string };
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
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [grns, setGrns] = useState<GRN[]>([]);

  const fetchPurchaseOrder = useCallback(async () => {
    if (!id) {
      setError('No purchase order ID provided');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await purchaseOrdersApi.getById(id);
      if (response.success && response.data) {
        const po = response.data as any;
        // Ensure lines is always an array
        if (!Array.isArray(po.lines)) {
          po.lines = [];
        }
        // Ensure supplier and warehouse are objects (not just IDs)
        if (typeof po.supplier === 'string') {
          po.supplier = { _id: po.supplier, name: 'Unknown' };
        }
        if (typeof po.warehouse === 'string') {
          po.warehouse = { _id: po.warehouse, name: 'Unknown' };
        }
        setPurchaseOrder(po as PurchaseOrder);
        setGrns(Array.isArray(response.grns) ? response.grns as GRN[] : []);
      } else {
        setError('Failed to load purchase order: ' + (response.message || 'Unknown error'));
        setPurchaseOrder(null);
      }
    } catch (err: any) {
      console.error('[PurchaseOrderDetailPage] Error:', err);
      setError(err.message || 'Failed to fetch purchase order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPurchaseOrder();
  }, [fetchPurchaseOrder]);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      if (response.success && Array.isArray(response.data)) {
        setBankAccounts(response.data as Array<{_id: string; name: string; accountType: string}>);
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  }, []);

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

  // Payment state
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState<Array<{_id: string; name: string; accountType: string}>>([]);

  useEffect(() => {
    if (paymentOpen) {
      fetchBankAccounts();
    }
  }, [paymentOpen, fetchBankAccounts]);

  const handleRecordPayment = async () => {
    if (!id || !paymentAmount) return;
    setPaymentSaving(true);
    try {
      const data: { amount: number; paymentMethod: string; notes?: string; bankAccountId?: string } = {
        amount: parseFloat(paymentAmount),
        paymentMethod,
        notes: paymentNotes || undefined,
      };
      if (
        (paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'mobile_money') &&
        bankAccountId
      ) {
        data.bankAccountId = bankAccountId;
      }
      await purchaseOrdersApi.recordPayment(id, data);
      setPaymentOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setBankAccountId('');
      fetchPurchaseOrder();
    } catch (error) {
      console.error('Failed to record payment:', error);
    } finally {
      setPaymentSaving(false);
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

  const formatCurrency = (amount: number | string | object | null | undefined, currency: string = 'USD') => {
    try {
      let num: number;
      if (amount == null) {
        num = 0;
      } else if (typeof amount === 'object') {
        // Handle Decimal128: { $numberDecimal: "123" }
        const raw = (amount as any).$numberDecimal || (amount as any).toString();
        num = parseFloat(raw) || 0;
      } else if (typeof amount === 'string') {
        num = parseFloat(amount) || 0;
      } else {
        num = amount;
      }
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
    } catch {
      return '0.00';
    }
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

  if (error || !purchaseOrder) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => navigate('/purchase-orders')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back', 'Back')}
            </Button>
          </div>
          <div className="bg-card rounded-lg border p-8 text-center">
            <p className="text-muted-foreground mb-2">{error || 'Purchase order not found'}</p>
            <p className="text-sm text-muted-foreground">ID: {id || 'undefined'}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const currentStatusStep = getStatusStep(purchaseOrder.status);

  return (
    <Layout>
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/purchase-orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
        </div>

        {/* Document Header */}
        <div className="bg-card dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {purchaseOrder.referenceNo || 'N/A'}
                </h1>
                {getStatusBadge(purchaseOrder.status)}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground dark:text-slate-400">{t('purchase.detail.supplier', 'Supplier')}</p>
                  <p className="font-medium dark:text-slate-200">{(purchaseOrder.supplier as any)?.name || '-'}</p>
                  {(purchaseOrder.supplier as any)?.contact?.contactPerson && <p className="text-muted-foreground dark:text-slate-400">{(purchaseOrder.supplier as any).contact.contactPerson}</p>}
                  {(purchaseOrder.supplier as any)?.contact?.email && <p className="text-muted-foreground dark:text-slate-400">{(purchaseOrder.supplier as any).contact.email}</p>}
                  {(purchaseOrder.supplier as any)?.contact?.phone && <p className="text-muted-foreground dark:text-slate-400">{(purchaseOrder.supplier as any).contact.phone}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-slate-400">{t('purchase.detail.warehouse', 'Warehouse')}</p>
                  <p className="font-medium dark:text-slate-200">{purchaseOrder.warehouse?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-slate-400">{t('purchase.detail.orderDate', 'Order Date')}</p>
                  <p className="font-medium dark:text-slate-200">{formatDate(purchaseOrder.orderDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-slate-400">{t('purchase.detail.expectedDelivery', 'Expected Delivery')}</p>
                  <p className="font-medium dark:text-slate-200">{purchaseOrder.expectedDeliveryDate ? formatDate(purchaseOrder.expectedDeliveryDate) : '-'}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-sm dark:text-slate-400">{t('purchase.detail.total', 'Total Amount')}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currencyCode)}
              </p>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="mt-6 pt-6 border-t dark:border-slate-600">
            <p className="text-sm font-medium mb-3 text-slate-900 dark:text-white">{t('purchase.detail.statusTimeline', 'Status Timeline')}</p>
            <div className="flex items-center gap-2">
              {STATUS_FLOW.map((step, index) => (
                <div key={step.status} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
                    index <= currentStatusStep 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground dark:bg-slate-700 dark:text-slate-400'
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
                      index < currentStatusStep ? 'bg-primary' : 'bg-muted dark:bg-slate-600'
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
          <div className="mt-6 pt-6 border-t dark:border-slate-600 flex gap-2">
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
            {(purchaseOrder.status === 'approved' || purchaseOrder.status === 'partially_received' || purchaseOrder.status === 'fully_received') && (purchaseOrder as any).paymentStatus !== 'paid' && (
              <Button variant="outline" onClick={() => setPaymentOpen(true)}>
                <DollarSign className="mr-2 h-4 w-4" />
                {t('purchase.detail.recordPayment', 'Record Payment')}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="dark:bg-slate-800">
            <TabsTrigger value="details" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">{t('purchase.detail.tabs.details', 'Details')}</TabsTrigger>
            <TabsTrigger value="grns" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              {t('purchase.detail.tabs.grns', 'GRNs')} 
              {grns.length > 0 && <Badge variant="secondary" className="ml-2">{grns.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="payments" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              {t('purchase.detail.tabs.payments', 'Payments')}
              {(purchaseOrder.payments?.length || 0) > 0 && <Badge variant="secondary" className="ml-2">{purchaseOrder.payments?.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">{t('purchase.detail.tabs.history', 'History')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('purchase.detail.lineItems', 'Line Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700">
                      <TableHead className="dark:text-white">{t('purchase.detail.product', 'Product')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('purchase.detail.qtyOrdered', 'Qty Ordered')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('purchase.detail.qtyReceived', 'Qty Received')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('purchase.detail.unitCost', 'Unit Cost')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('purchase.detail.tax', 'Tax')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('purchase.detail.total', 'Total')}</TableHead>
                      <TableHead className="dark:text-white">{t('purchase.detail.budget', 'Budget')}</TableHead>
                      <TableHead className="dark:text-white">{t('purchase.detail.account', 'Account')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrder.lines?.map((line) => (
                      <TableRow key={line._id} className="dark:hover:bg-slate-700/50">
                        <TableCell>
                          <div>
                            <p className="font-medium dark:text-slate-200">{line.product?.name || '-'}</p>
                            <p className="text-sm text-muted-foreground dark:text-slate-400">{line.product?.sku || ''}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right dark:text-slate-300">{line.qtyOrdered}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{line.qtyReceived || 0}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{formatCurrency(line.unitCost, purchaseOrder.currencyCode)}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{formatCurrency(line.taxAmount, purchaseOrder.currencyCode)}</TableCell>
                        <TableCell className="text-right font-medium dark:text-slate-200">{formatCurrency(line.lineTotal, purchaseOrder.currencyCode)}</TableCell>
                        <TableCell className="dark:text-slate-300">
                          {(() => {
                            if (typeof line.budgetId === 'object' && line.budgetId?.name) {
                              return (
                                <Badge variant="outline" className="text-xs dark:border-slate-600 dark:text-slate-300">
                                  {line.budgetId.name}
                                </Badge>
                              );
                            } else if (typeof line.budgetId === 'string' && line.budgetId) {
                              return (
                                <Badge variant="outline" className="text-xs dark:border-slate-600 dark:text-slate-300">
                                  {line.budgetId.substring(0, 8)}...
                                </Badge>
                              );
                            }
                            return <span className="text-muted-foreground text-sm">-</span>;
                          })()}
                        </TableCell>
                        <TableCell className="dark:text-slate-300">
                          {(() => {
                            if (typeof line.accountId === 'object' && line.accountId?.code) {
                              return (
                                <span className="text-xs">{line.accountId.code} - {line.accountId.name}</span>
                              );
                            } else if (typeof line.accountId === 'string' && line.accountId) {
                              return (
                                <span className="text-xs">{line.accountId.substring(0, 8)}...</span>
                              );
                            }
                            return <span className="text-muted-foreground text-sm">-</span>;
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Summary */}
                <div className="mt-4 pt-4 border-t dark:border-slate-600 flex justify-end gap-8">
                  <div className="text-right">
                    <p className="text-muted-foreground dark:text-slate-400">{t('purchase.detail.subtotal', 'Subtotal')}</p>
                    <p className="font-medium dark:text-slate-200">{formatCurrency(purchaseOrder.subtotal, purchaseOrder.currencyCode)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground dark:text-slate-400">{t('purchase.detail.tax', 'Tax')}</p>
                    <p className="font-medium dark:text-slate-200">{formatCurrency(purchaseOrder.taxAmount, purchaseOrder.currencyCode)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white">{t('purchase.detail.total', 'Total')}</p>
                    <p className="font-bold text-lg text-slate-900 dark:text-white">{formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currencyCode)}</p>
                  </div>
                </div>

                {/* Notes */}
                {purchaseOrder.notes && (
                  <div className="mt-4 pt-4 border-t dark:border-slate-600">
                    <p className="text-muted-foreground text-sm dark:text-slate-400">{t('purchase.detail.notes', 'Notes')}</p>
                    <p className="dark:text-slate-200">{purchaseOrder.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grns" className="mt-4">
            <Card className="dark:bg-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-slate-900 dark:text-white">{t('purchase.detail.grnList', 'Goods Received Notes')}</CardTitle>
                {purchaseOrder.status === 'approved' && (
                  <Button size="sm" onClick={() => navigate('/grn/new', { state: { purchaseOrderId: id } })}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('purchase.detail.createGRN', 'Create GRN')}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {grns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                    <Truck className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('purchase.detail.noGRNs', 'No GRNs found for this purchase order')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700">
                        <TableHead className="dark:text-white">{t('purchase.detail.grnRef', 'GRN Reference')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.detail.receivedDate', 'Received Date')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.detail.status', 'Status')}</TableHead>
                        <TableHead className="text-right dark:text-white">{t('purchase.detail.amount', 'Amount')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.detail.confirmedBy', 'Confirmed By')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grns.map((grn) => (
                        <TableRow key={grn._id} className="dark:hover:bg-slate-700/50">
                          <TableCell className="font-medium dark:text-slate-200">{grn.referenceNo}</TableCell>
                          <TableCell className="dark:text-slate-300">{formatDate(grn.receivedDate)}</TableCell>
                          <TableCell>
                            <Badge variant={grn.status === 'confirmed' ? 'default' : 'secondary'}>
                              {grn.status === 'confirmed' ? t('purchase.grn.confirmed', 'Confirmed') : t('purchase.grn.draft', 'Draft')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right dark:text-slate-300">{formatCurrency(grn.totalAmount, purchaseOrder.currencyCode)}</TableCell>
                          <TableCell className="dark:text-slate-300">
                            {grn.confirmedBy?.name || '-'}
                            {grn.confirmedAt && <span className="text-muted-foreground text-sm ml-2 dark:text-slate-400">{formatDate(grn.confirmedAt)}</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <Card className="dark:bg-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-slate-900 dark:text-white">{t('purchase.detail.paymentsTitle', 'Payments')}</CardTitle>
                {purchaseOrder.status !== 'cancelled' && (purchaseOrder.paymentStatus || 'unpaid') !== 'paid' && (
                  <Button size="sm" onClick={() => setPaymentOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('purchase.detail.recordPayment', 'Record Payment')}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {/* Payment Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-muted dark:bg-slate-700 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground dark:text-slate-400">{t('purchase.detail.totalAmount', 'Total Amount')}</p>
                    <p className="text-lg font-bold dark:text-white">{formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currencyCode)}</p>
                  </div>
                  <div className="bg-muted dark:bg-slate-700 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground dark:text-slate-400">{t('purchase.detail.amountPaid', 'Amount Paid')}</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency((purchaseOrder.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0), purchaseOrder.currencyCode)}</p>
                  </div>
                  <div className="bg-muted dark:bg-slate-700 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground dark:text-slate-400">{t('purchase.detail.balance', 'Balance')}</p>
                    <p className="text-lg font-bold text-red-600 dark:text-green-400">{formatCurrency((Number(purchaseOrder.totalAmount) - (purchaseOrder.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0)), purchaseOrder.currencyCode)}</p>
                  </div>
                </div>

                {/* Payments Table */}
                {(!purchaseOrder.payments || purchaseOrder.payments.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                    <DollarSign className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('purchase.detail.noPayments', 'No payments recorded yet')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700">
                        <TableHead className="dark:text-white">{t('purchase.detail.date', 'Date')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.detail.method', 'Method')}</TableHead>
                        <TableHead className="text-right dark:text-white">{t('purchase.detail.amount', 'Amount')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchase.detail.notes', 'Notes')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(purchaseOrder.payments || []).map((payment: any, idx: number) => (
                        <TableRow key={idx} className="dark:hover:bg-slate-700/50">
                          <TableCell className="dark:text-slate-300">{new Date(payment.paidDate || payment.date).toLocaleDateString()}</TableCell>
                          <TableCell><Badge variant="outline">{payment.paymentMethod}</Badge></TableCell>
                          <TableCell className="text-right font-medium dark:text-slate-200">{formatCurrency(payment.amount, purchaseOrder.currencyCode)}</TableCell>
                          <TableCell className="dark:text-slate-300">{payment.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Record Payment Dialog */}
                {paymentOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full mx-4">
                      <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">{t('purchase.detail.recordPayment', 'Record Payment')}</h3>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-slate-900 dark:text-white">{t('purchase.detail.paymentAmount', 'Amount')}</Label>
                          <Input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder={String((purchaseOrder as any).balance ?? purchaseOrder.totalAmount)}
                            className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-900 dark:text-white">{t('purchase.detail.paymentMethod', 'Payment Method')}</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                              <SelectItem value="cash" className="dark:text-slate-200">Cash</SelectItem>
                              <SelectItem value="card" className="dark:text-slate-200">Card</SelectItem>
                              <SelectItem value="bank_transfer" className="dark:text-slate-200">Bank Transfer</SelectItem>
                              <SelectItem value="cheque" className="dark:text-slate-200">Cheque</SelectItem>
                              <SelectItem value="mobile_money" className="dark:text-slate-200">Mobile Money</SelectItem>
                              <SelectItem value="credit" className="dark:text-slate-200">Credit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-slate-900 dark:text-white">{t('purchase.detail.paymentNotes', 'Notes')}</Label>
                          <Textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2} className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600" />
                        </div>
                        {(paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'mobile_money') && (
                          <div>
                            <Label className="text-slate-900 dark:text-white">{t('purchase.detail.bankAccount', 'Bank Account')}</Label>
                            <Select value={bankAccountId} onValueChange={setBankAccountId}>
                              <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                                <SelectValue placeholder="Select bank account" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                {bankAccounts.map((acc) => (
                                  <SelectItem key={acc._id} value={acc._id} className="dark:text-slate-200">
                                    {acc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setPaymentOpen(false)} className="border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={handleRecordPayment} disabled={paymentSaving || !paymentAmount} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200">
                          {paymentSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                          {paymentSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                          {t('purchase.detail.submitPayment', 'Submit Payment')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('purchase.detail.historyTitle', 'Activity History')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="font-medium dark:text-slate-200">{t('purchase.history.created', 'Purchase Order Created')}</p>
                      <p className="text-sm text-muted-foreground dark:text-slate-400">
                        {purchaseOrder.createdBy?.name || 'Unknown'} - {formatDate(purchaseOrder.createdAt)}
                      </p>
                    </div>
                  </div>
                  {purchaseOrder.approvedAt && (
                    <div className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div>
                        <p className="font-medium dark:text-slate-200">{t('purchase.history.approved', 'Purchase Order Approved')}</p>
                        <p className="text-sm text-muted-foreground dark:text-slate-400">
                          {purchaseOrder.approvedBy?.name || 'Unknown'} - {formatDate(purchaseOrder.approvedAt)}
                        </p>
                      </div>
                    </div>
                  )}
                  {purchaseOrder.status === 'partially_received' && (
                    <div className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
                      <div>
                        <p className="font-medium dark:text-slate-200">{t('purchase.history.partialReceived', 'Partially Received')}</p>
                      </div>
                    </div>
                  )}
                  {purchaseOrder.status === 'fully_received' && (
                    <div className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div>
                        <p className="font-medium dark:text-slate-200">{t('purchase.history.fullyReceived', 'Fully Received')}</p>
                      </div>
                    </div>
                  )}
                  {purchaseOrder.status === 'cancelled' && (
                    <div className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                      <div>
                        <p className="font-medium dark:text-slate-200">{t('purchase.history.cancelled', 'Purchase Order Cancelled')}</p>
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