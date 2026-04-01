import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { purchaseReturnsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface PurchaseReturnDetail {
  _id: string;
  referenceNo: string;
  grn?: {
    _id: string;
    referenceNo: string;
  };
  supplier?: {
    _id: string;
    name: string;
    code?: string;
  };
  warehouse?: {
    _id: string;
    name: string;
    code?: string;
  };
  returnDate: string;
  reason: string;
  supplierCreditNoteNo?: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  lines: Array<{
    _id: string;
    product: {
      _id: string;
      name: string;
      sku: string;
    };
    qtyReturned: number;
    unitCost: number;
  }>;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  confirmedBy?: {
    name: string;
    email: string;
  };
  createdBy?: {
    name: string;
    email: string;
  };
}

export default function PurchaseReturnDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturnDetail | null>(null);

  const fetchPurchaseReturn = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await purchaseReturnsApi.getById(id);
      if (response.success) {
        setPurchaseReturn(response.data as PurchaseReturnDetail);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch purchase return');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPurchaseReturn();
  }, [fetchPurchaseReturn]);

  const handleConfirm = async () => {
    if (!id) return;

    setConfirming(true);
    try {
      await purchaseReturnsApi.confirm(id);
      fetchPurchaseReturn();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm purchase return');
    } finally {
      setConfirming(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: t('purchaseReturns.status.draft', 'Draft') },
      confirmed: { variant: 'default', label: t('purchaseReturns.status.confirmed', 'Confirmed') },
      cancelled: { variant: 'destructive', label: t('purchaseReturns.status.cancelled', 'Cancelled') },
    };

    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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

  if (!purchaseReturn) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              {error || 'Purchase return not found'}
            </p>
            <Button variant="link" onClick={() => navigate('/purchase-returns')}>
              {t('common.back', 'Back to Purchase Returns')}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/purchase-returns')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold">{purchaseReturn.referenceNo}</h1>
          {getStatusBadge(purchaseReturn.status)}
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {t('purchaseReturns.supplier', 'Supplier')}
                    </h3>
                    <div className="font-medium">{purchaseReturn.supplier?.name || 'N/A'}</div>
                    {purchaseReturn.supplier?.code && (
                      <div className="text-sm text-muted-foreground">{purchaseReturn.supplier.code}</div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {t('purchaseReturns.warehouse', 'Warehouse')}
                    </h3>
                    <div className="font-medium">{purchaseReturn.warehouse?.name || 'N/A'}</div>
                    {purchaseReturn.warehouse?.code && (
                      <div className="text-sm text-muted-foreground">{purchaseReturn.warehouse.code}</div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {t('purchaseReturns.grn', 'GRN')}
                    </h3>
                    <div className="font-medium">{purchaseReturn.grn?.referenceNo || '-'}</div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {t('purchaseReturns.reason', 'Reason')}
                    </h3>
                    <div className="font-medium">{purchaseReturn.reason}</div>
                  </div>
                </div>
                {purchaseReturn.supplierCreditNoteNo && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {t('purchaseReturns.supplierCreditNote', 'Supplier Credit Note #')}
                    </h3>
                    <div className="font-medium">{purchaseReturn.supplierCreditNoteNo}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>{t('purchaseReturns.lineItems', 'Line Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('purchaseReturns.product', 'Product')}</TableHead>
                      <TableHead className="text-right">{t('purchaseReturns.qtyReturned', 'Qty Returned')}</TableHead>
                      <TableHead className="text-right">{t('purchaseReturns.unitCost', 'Unit Cost')}</TableHead>
                      <TableHead className="text-right">{t('purchaseReturns.lineTotal', 'Total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseReturn.lines?.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium">{line.product.name}</div>
                          <div className="text-sm text-muted-foreground">{line.product.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">{line.qtyReturned}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.unitCost)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(line.qtyReturned * line.unitCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>{t('purchaseReturns.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('purchaseReturns.subtotal', 'Subtotal')}</span>
                    <span className="font-medium">{formatCurrency(purchaseReturn.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('purchaseReturns.tax', 'Tax')}</span>
                    <span className="font-medium">{formatCurrency(purchaseReturn.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>{t('purchaseReturns.total', 'Total')}</span>
                    <span>{formatCurrency(purchaseReturn.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>{t('purchaseReturns.dates', 'Dates')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        {t('purchaseReturns.returnDate', 'Return Date')}
                      </div>
                      <div className="font-medium">{formatDate(purchaseReturn.returnDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        {t('purchaseReturns.createdAt', 'Created')}
                      </div>
                      <div className="font-medium">{formatDate(purchaseReturn.createdAt)}</div>
                    </div>
                  </div>
                  {purchaseReturn.confirmedAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {t('purchaseReturns.confirmedAt', 'Confirmed')}
                        </div>
                        <div className="font-medium">{formatDate(purchaseReturn.confirmedAt)}</div>
                        {purchaseReturn.confirmedBy && (
                          <div className="text-sm text-muted-foreground">
                            By: {purchaseReturn.confirmedBy.name}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {purchaseReturn.status === 'draft' && (
              <Card>
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
                      {t('purchaseReturns.confirm', 'Confirm Return')}
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
