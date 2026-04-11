import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { grnApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  Package,
  FileText,
  Calendar,
  Truck,
  Loader2
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useTranslation } from 'react-i18next';

interface GRNDetail {
  _id: string;
  referenceNo: string;
  purchaseOrder?: {
    _id: string;
    referenceNo: string;
    orderDate: string;
    expectedDeliveryDate?: string;
  };
  supplier?: {
    _id: string;
    name: string;
    code?: string;
    contact?: {
      phone?: string;
      email?: string;
      address?: string;
      contactPerson?: string;
    };
  };
  warehouse?: {
    _id: string;
    name: string;
    code?: string;
  };
  receivedDate: string;
  status: 'draft' | 'confirmed';
  totalAmount: number;
  supplierInvoiceNo?: string;
  lines: Array<{
    _id: string;
    product: {
      _id: string;
      name: string;
      sku: string;
      unit?: string;
    };
    qtyReceived: number;
    unitCost: number;
    taxRate: number;
    lineTotal: number;
  }>;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  confirmedBy?: {
    name: string;
    email: string;
  };
}

interface HistoryEntry {
  action: string;
  timestamp: string;
  user?: string;
  details?: string;
}

export default function GRNDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [grn, setGRN] = useState<GRNDetail | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const fetchGRN = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const response = await grnApi.getById(id);
      if (response.success) {
        setGRN(response.data as GRNDetail);
        // Create mock history based on GRN data
        const entries: HistoryEntry[] = [
          { action: 'GRN Created', timestamp: grn?.createdAt || new Date().toISOString(), details: 'Goods Received Note created as draft' }
        ];
        if (grn?.confirmedAt) {
          entries.push({ action: 'GRN Confirmed', timestamp: grn.confirmedAt, user: grn.confirmedBy?.name, details: 'GRN confirmed and inventory updated' });
        }
        setHistory(entries);
      }
    } catch (error) {
      console.error('Failed to fetch GRN:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGRN();
  }, [fetchGRN]);

  const handleConfirm = async () => {
    if (!id) return;
    
    setConfirming(true);
    try {
      await grnApi.confirm(id);
      fetchGRN();
    } catch (error) {
      console.error('Failed to confirm GRN:', error);
    } finally {
      setConfirming(false);
    }
  };

  const formatCurrency = (amount: number | string | object | null | undefined) => {
    let num: number;
    if (amount == null) {
      num = 0;
    } else if (typeof amount === 'object') {
      const raw = (amount as any).$numberDecimal || (amount as any).toString();
      num = parseFloat(raw) || 0;
    } else if (typeof amount === 'string') {
      num = parseFloat(amount) || 0;
    } else {
      num = amount;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toNum = (v: any): number => {
    if (v == null) return 0;
    if (typeof v === 'object' && v.$numberDecimal) return parseFloat(v.$numberDecimal) || 0;
    return parseFloat(String(v)) || 0;
  };

  const calculateSubtotal = () => {
    if (!grn?.lines) return 0;
    return grn.lines.reduce((sum, line) => sum + (toNum(line.qtyReceived) * toNum(line.unitCost)), 0);
  };

  const calculateTax = () => {
    if (!grn?.lines) return 0;
    return grn.lines.reduce((sum, line) => {
      const lineTotal = toNum(line.qtyReceived) * toNum(line.unitCost);
      return sum + (lineTotal * (toNum(line.taxRate) / 100));
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: t('grn.status.draft', 'Draft') },
      confirmed: { variant: 'default', label: t('grn.status.confirmed', 'Confirmed') },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!grn) {
    return (
      <Layout>
        <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
          <div className="text-center">
            <p className="text-muted-foreground dark:text-slate-400">GRN not found</p>
            <Button variant="link" onClick={() => navigate('/grn')}>
              {t('common.back', 'Back to GRN List')}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/grn')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{grn.referenceNo}</h1>
          {getStatusBadge(grn.status)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Header */}
            <Card className="dark:bg-slate-800">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400 mb-2">
                      {t('grn.supplier', 'Supplier')}
                    </h3>
                    <div className="font-medium dark:text-slate-200">{grn.supplier?.name || 'N/A'}</div>
                    {grn.supplier?.code && (
                      <div className="text-sm text-muted-foreground dark:text-slate-400">{grn.supplier.code}</div>
                    )}
                    {grn.supplier?.contact?.address && (
                      <div className="text-sm text-muted-foreground dark:text-slate-400 mt-1">{grn.supplier.contact.address}</div>
                    )}
                    {grn.supplier?.contact?.email && (
                      <div className="text-sm text-muted-foreground dark:text-slate-400">{grn.supplier.contact.email}</div>
                    )}
                    {grn.supplier?.contact?.phone && (
                      <div className="text-sm text-muted-foreground dark:text-slate-400">{grn.supplier.contact.phone}</div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400 mb-2">
                      {t('grn.warehouse', 'Warehouse')}
                    </h3>
                    <div className="font-medium dark:text-slate-200">{grn.warehouse?.name || 'N/A'}</div>
                    {grn.warehouse?.code && (
                      <div className="text-sm text-muted-foreground dark:text-slate-400">{grn.warehouse.code}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('grn.lineItems', 'Line Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700">
                      <TableHead className="dark:text-white">{t('grn.product', 'Product')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('grn.qtyReceived', 'Qty Received')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('grn.unitCost', 'Unit Cost')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('grn.taxRate', 'Tax %')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('grn.lineTotal', 'Total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grn.lines?.map((line, index) => (
                      <TableRow key={index} className="dark:hover:bg-slate-700/50">
                        <TableCell>
                          <div className="font-medium dark:text-slate-200">{line.product.name}</div>
                          <div className="text-sm text-muted-foreground dark:text-slate-400">{line.product.sku}</div>
                        </TableCell>
                        <TableCell className="text-right dark:text-slate-300">{line.qtyReceived}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{formatCurrency(line.unitCost)}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{line.taxRate}%</TableCell>
                        <TableCell className="text-right font-medium dark:text-slate-200">
                          {formatCurrency((Number(line.qtyReceived) || 0) * (Number(line.unitCost) || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="dark:bg-slate-700">
                <TabsTrigger value="details" className="dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-white">{t('grn.tabs.details', 'Details')}</TabsTrigger>
                <TabsTrigger value="history" className="dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-white">{t('grn.tabs.history', 'History')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <Card className="dark:bg-slate-800">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400 mb-2">
                          {t('grn.purchaseOrder', 'Purchase Order')}
                        </h3>
                        <div className="font-medium dark:text-slate-200">
                          {grn.purchaseOrder?.referenceNo || '-'}
                        </div>
                        {grn.purchaseOrder?.orderDate && (
                          <div className="text-sm text-muted-foreground dark:text-slate-400">
                            Order Date: {formatDate(grn.purchaseOrder.orderDate)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400 mb-2">
                          {t('grn.supplierInvoice', 'Supplier Invoice')}
                        </h3>
                        <div className="font-medium dark:text-slate-200">
                          {grn.supplierInvoiceNo || '-'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="history">
                <Card className="dark:bg-slate-800">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {history.map((entry, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                            {index < history.length - 1 && (
                              <div className="w-0.5 h-full bg-border dark:bg-slate-600 mt-2" />
                            )}
                          </div>
                          <div className="pb-4">
                            <div className="font-medium dark:text-slate-200">{entry.action}</div>
                            <div className="text-sm text-muted-foreground dark:text-slate-400">
                              {formatDate(entry.timestamp)}
                            </div>
                            {entry.user && (
                              <div className="text-sm text-muted-foreground dark:text-slate-400">
                                By: {entry.user}
                              </div>
                            )}
                            {entry.details && (
                              <div className="text-sm mt-1 dark:text-slate-300">{entry.details}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('grn.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('grn.subtotal', 'Subtotal')}</span>
                    <span className="font-medium dark:text-slate-200">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('grn.tax', 'Tax')}</span>
                    <span className="font-medium dark:text-slate-200">{formatCurrency(calculateTax())}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t dark:border-slate-600">
                    <span className="text-slate-900 dark:text-white">{t('grn.total', 'Total')}</span>
                    <span className="text-slate-900 dark:text-white">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('grn.dates', 'Dates')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
                    <div>
                      <div className="text-sm text-muted-foreground dark:text-slate-400">
                        {t('grn.receivedDate', 'Received Date')}
                      </div>
                      <div className="font-medium dark:text-slate-200">{formatDate(grn.receivedDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
                    <div>
                      <div className="text-sm text-muted-foreground dark:text-slate-400">
                        {t('grn.createdAt', 'Created')}
                      </div>
                      <div className="font-medium dark:text-slate-200">{formatDate(grn.createdAt)}</div>
                    </div>
                  </div>
                  {grn.confirmedAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-sm text-muted-foreground dark:text-slate-400">
                          {t('grn.confirmedAt', 'Confirmed')}
                        </div>
                        <div className="font-medium dark:text-slate-200">{formatDate(grn.confirmedAt)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {grn.status === 'draft' && (
              <Card className="dark:bg-slate-800">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={handleConfirm}
                      disabled={confirming}
                      className="w-full"
                    >
                      {confirming ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      {t('grn.confirm', 'Confirm GRN')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}