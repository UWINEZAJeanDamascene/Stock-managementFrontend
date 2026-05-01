import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { purchaseReturnsApi, bankAccountsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Calendar,
  Loader2,
  AlertCircle,
  CreditCard,
  Building2,
  Wallet,
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
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
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
  // Refund fields
  refundMethod?: 'none' | 'credit' | 'bank_transfer' | 'cash';
  bankAccountId?: string;
  bankRefundReference?: string;
  refundedAt?: string;
}

export default function PurchaseReturnDetailPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturnDetail | null>(null);
  const [sendEmail, setSendEmail] = useState(false);
  
  // Refund dialog state
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundMethod, setRefundMethod] = useState<'credit' | 'bank_transfer' | 'cash'>('credit');
  const [bankAccountId, setBankAccountId] = useState('');
  const [refundReference, setRefundReference] = useState('');
  const [bankAccounts, setBankAccounts] = useState<Array<{_id: string; name: string}>>([]);
  const [processingRefund, setProcessingRefund] = useState(false);

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
      await purchaseReturnsApi.confirm(id, sendEmail);
      fetchPurchaseReturn();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm purchase return');
    } finally {
      setConfirming(false);
    }
  };

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      if (response.success && Array.isArray(response.data)) {
        setBankAccounts(response.data as Array<{_id: string; name: string}>);
      }
    } catch (err) {
      console.error('Failed to fetch bank accounts:', err);
    }
  }, []);

  const handleRefund = async () => {
    if (!id || !refundMethod) return;

    setProcessingRefund(true);
    try {
      await purchaseReturnsApi.processRefund(id, {
        refundMethod,
        bankAccountId: refundMethod === 'bank_transfer' ? bankAccountId : undefined,
        reference: refundReference || undefined,
      }, sendEmail);
      setShowRefundDialog(false);
      fetchPurchaseReturn();
    } catch (err: any) {
      setError(err.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  const openRefundDialog = () => {
    setRefundMethod('credit');
    setBankAccountId('');
    setRefundReference('');
    fetchBankAccounts();
    setShowRefundDialog(true);
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
          <Button variant="ghost" onClick={() => navigate('/purchase-returns')} className="dark:text-gray-300">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold dark:text-gray-100">{purchaseReturn.referenceNo}</h1>
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
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-gray-400 mb-2">
                      {t('purchaseReturns.supplier', 'Supplier')}
                    </h3>
                    <div className="font-medium dark:text-gray-200">{purchaseReturn.supplier?.name || 'N/A'}</div>
                    {purchaseReturn.supplier?.code && (
                      <div className="text-sm text-muted-foreground dark:text-gray-400">{purchaseReturn.supplier.code}</div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-gray-400 mb-2">
                      {t('purchaseReturns.warehouse', 'Warehouse')}
                    </h3>
                    <div className="font-medium dark:text-gray-200">{purchaseReturn.warehouse?.name || 'N/A'}</div>
                    {purchaseReturn.warehouse?.code && (
                      <div className="text-sm text-muted-foreground dark:text-gray-400">{purchaseReturn.warehouse.code}</div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-gray-400 mb-2">
                      {t('purchaseReturns.grn', 'GRN')}
                    </h3>
                    <div className="font-medium dark:text-gray-200">{purchaseReturn.grn?.referenceNo || '-'}</div>
                  </div>
                    <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-gray-400 mb-2">
                      {t('purchaseReturns.reason', 'Reason')}
                    </h3>
                    <div className="font-medium dark:text-gray-200">{purchaseReturn.reason}</div>
                  </div>
                </div>
                {purchaseReturn.supplierCreditNoteNo && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-gray-400 mb-2">
                      {t('purchaseReturns.supplierCreditNote', 'Supplier Credit Note #')}
                    </h3>
                    <div className="font-medium dark:text-gray-200">{purchaseReturn.supplierCreditNoteNo}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">{t('purchaseReturns.lineItems', 'Line Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="dark:bg-slate-800">
                    <TableRow className="dark:hover:bg-slate-700/50">
                      <TableHead className="dark:text-gray-300">{t('purchaseReturns.product', 'Product')}</TableHead>
                      <TableHead className="text-right dark:text-gray-300">{t('purchaseReturns.qtyReturned', 'Qty Returned')}</TableHead>
                      <TableHead className="text-right dark:text-gray-300">{t('purchaseReturns.unitCost', 'Unit Cost')}</TableHead>
                      <TableHead className="text-right dark:text-gray-300">{t('purchaseReturns.lineTotal', 'Total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="dark:bg-slate-800">
                    {purchaseReturn.lines?.map((line, index) => (
                      <TableRow key={index} className="dark:hover:bg-slate-700/50">
                        <TableCell className="dark:bg-slate-800">
                          <div className="font-medium dark:text-gray-200">{line.product.name}</div>
                          <div className="text-sm text-muted-foreground dark:text-gray-400">{line.product.sku}</div>
                        </TableCell>
                        <TableCell className="text-right dark:text-gray-300 dark:bg-slate-800">{line.qtyReturned}</TableCell>
                        <TableCell className="text-right dark:text-gray-300 dark:bg-slate-800">{formatCurrency(line.unitCost)}</TableCell>
                        <TableCell className="text-right font-medium dark:text-gray-200 dark:bg-slate-800">
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
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">{t('purchaseReturns.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-400">{t('purchaseReturns.subtotal', 'Subtotal')}</span>
                    <span className="font-medium dark:text-gray-200">{formatCurrency(purchaseReturn.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-400">{t('purchaseReturns.tax', 'Tax')}</span>
                    <span className="font-medium dark:text-gray-200">{formatCurrency(purchaseReturn.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t dark:border-slate-700 dark:text-gray-100">
                    <span>{t('purchaseReturns.total', 'Total')}</span>
                    <span className="dark:text-gray-100">{formatCurrency(purchaseReturn.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">{t('purchaseReturns.dates', 'Dates')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                    <div>
                      <div className="text-sm text-muted-foreground dark:text-gray-400">
                        {t('purchaseReturns.returnDate', 'Return Date')}
                      </div>
                      <div className="font-medium dark:text-gray-200">{formatDate(purchaseReturn.returnDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                    <div>
                      <div className="text-sm text-muted-foreground dark:text-gray-400">
                        {t('purchaseReturns.createdAt', 'Created')}
                      </div>
                      <div className="font-medium dark:text-gray-200">{formatDate(purchaseReturn.createdAt)}</div>
                    </div>
                  </div>
                  {purchaseReturn.confirmedAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                      <div>
                        <div className="text-sm text-muted-foreground dark:text-gray-400">
                          {t('purchaseReturns.confirmedAt', 'Confirmed')}
                        </div>
                        <div className="font-medium dark:text-gray-200">{formatDate(purchaseReturn.confirmedAt)}</div>
                        {purchaseReturn.confirmedBy && (
                          <div className="text-sm text-muted-foreground dark:text-gray-400">
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
              <Card className="dark:border-slate-700 dark:bg-slate-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="sendEmailPR"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="sendEmailPR" className="cursor-pointer text-sm">
                      Send email notification to supplier
                    </Label>
                  </div>
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

            {/* Refund Action */}
            {purchaseReturn.status === 'confirmed' && (!purchaseReturn.refundMethod || purchaseReturn.refundMethod === 'none') && (
              <Card className="dark:border-slate-700 dark:bg-slate-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="sendEmailPRRefund"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="sendEmailPRRefund" className="cursor-pointer text-sm">
                      Send email notification to supplier
                    </Label>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={openRefundDialog}
                      className="w-full"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {t('purchaseReturns.processRefund', 'Process Refund')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Refund Info */}
            {purchaseReturn.status === 'confirmed' && purchaseReturn.refundMethod && purchaseReturn.refundMethod !== 'none' && (
              <Card className="dark:border-slate-700 dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="dark:text-gray-100">{t('purchaseReturns.refundInfo', 'Refund Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-400">Refund Method:</span>
                    <span className="font-medium capitalize dark:text-gray-200">{purchaseReturn.refundMethod.replace('_', ' ')}</span>
                  </div>
                  {purchaseReturn.refundedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground dark:text-gray-400">Refunded At:</span>
                      <span className="font-medium dark:text-gray-200">{formatDate(purchaseReturn.refundedAt)}</span>
                    </div>
                  )}
                  {purchaseReturn.bankRefundReference && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground dark:text-gray-400">Reference:</span>
                      <span className="font-medium dark:text-gray-200">{purchaseReturn.bankRefundReference}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Refund Dialog */}
            <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
              <DialogContent className="dark:border-slate-700 dark:bg-slate-800">
                <DialogHeader>
                  <DialogTitle className="dark:text-gray-100">{t('purchaseReturns.processRefund', 'Process Refund')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="dark:text-gray-200">Refund Method</Label>
                    <Select value={refundMethod} onValueChange={(v: any) => setRefundMethod(v)}>
                      <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                        <SelectItem value="credit" className="dark:text-gray-200">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Credit to Supplier Account
                          </span>
                        </SelectItem>
                        <SelectItem value="bank_transfer" className="dark:text-gray-200">
                          <span className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" /> Bank Transfer
                          </span>
                        </SelectItem>
                        <SelectItem value="cash" className="dark:text-gray-200">
                          <span className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" /> Cash
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(refundMethod === 'bank_transfer') && (
                    <div className="space-y-2">
                      <Label className="dark:text-gray-200">Bank Account</Label>
                      <Select value={bankAccountId} onValueChange={setBankAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank account" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                          {bankAccounts.map((acc) => (
                            <SelectItem key={acc._id} value={acc._id} className="dark:text-gray-200">
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="dark:text-gray-200">Reference (Optional)</Label>
                    <Input
                      value={refundReference}
                      onChange={(e) => setRefundReference(e.target.value)}
                      placeholder="Enter reference number"
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>

                  <div className="bg-muted p-3 rounded-md dark:bg-slate-700">
                    <div className="text-sm text-muted-foreground dark:text-gray-400">Refund Amount</div>
                    <div className="text-xl font-bold dark:text-gray-100">{formatCurrency(purchaseReturn?.totalAmount || 0)}</div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRefundDialog(false)} className="dark:border-slate-600 dark:text-gray-200">
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button
                    onClick={handleRefund}
                    disabled={processingRefund || (refundMethod === 'bank_transfer' && !bankAccountId)}
                  >
                    {processingRefund && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('purchaseReturns.processRefund', 'Process Refund')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </Layout>
  );
}
