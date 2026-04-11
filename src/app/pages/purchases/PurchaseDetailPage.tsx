import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { purchasesApi, bankAccountsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { useTranslation } from 'react-i18next';

interface PurchaseItem {
  product: { _id: string; name: string; sku: string; unit?: string };
  quantity: string;
  unitCost: string;
  subtotal: string;
  taxAmount: string;
  totalWithTax: string;
  taxCode?: string;
  taxRate?: string;
}

interface Payment {
  amount: string;
  paymentMethod: string;
  reference?: string;
  paidDate: string;
  notes?: string;
  recordedBy?: { name: string; email: string };
}

interface BankAccount {
  _id: string;
  name: string;
  accountType: string;
  currentBalance?: number;
  cachedBalance?: number;
  isActive: boolean;
}

interface Purchase {
  _id: string;
  purchaseNumber: string;
  supplier: {
    _id: string;
    name: string;
    code?: string;
    contact?: string;
    type?: string;
    taxId?: string;
  };
  supplierName?: string;
  supplierTin?: string;
  supplierAddress?: string;
  supplierInvoiceNumber?: string;
  supplierInvoiceDate?: string;
  status: 'draft' | 'ordered' | 'received' | 'partial' | 'paid' | 'cancelled';
  currency: string;
  paymentTerms: string;
  purchaseDate: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  items: PurchaseItem[];
  subtotal: string;
  totalDiscount: string;
  totalTax: string;
  grandTotal: string;
  roundedAmount: string;
  amountPaid: string;
  balance: string;
  payments: Payment[];
  notes?: string;
  createdBy?: { name: string; email: string };
  confirmedDate?: string;
  confirmedBy?: { name: string; email: string };
  cancelledDate?: string;
  cancellationReason?: string;
  createdAt: string;
}

export default function PurchaseDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [purchase, setPurchase] = useState<Purchase | null>(null);

  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchPurchase = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await purchasesApi.getById(id);
      if (response.success) {
        setPurchase(response.data as Purchase);
      } else {
        setPurchase(null);
      }
    } catch (error) {
      console.error('Failed to fetch purchase:', error);
      setPurchase(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      if (response.success && Array.isArray(response.data)) {
        setBankAccounts(response.data as BankAccount[]);
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchPurchase();
  }, [fetchPurchase]);

  const handleReceive = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await purchasesApi.receive(id);
      fetchPurchase();
    } catch (error) {
      console.error('Failed to receive purchase:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await purchasesApi.cancel(id);
      fetchPurchase();
    } catch (error) {
      console.error('Failed to cancel purchase:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleShowPaymentForm = () => {
    setShowPaymentForm(true);
    fetchBankAccounts();
    if (purchase && parseFloat(purchase.balance) > 0) {
      setPaymentAmount(purchase.balance);
    }
  };

  const handleRecordPayment = async () => {
    if (!id || !paymentAmount) return;
    setPaymentLoading(true);
    try {
      const data: any = {
        amount: parseFloat(paymentAmount),
        paymentMethod: paymentMethod as any,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      };
      if (
        (paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'mobile_money') &&
        bankAccountId
      ) {
        data.bankAccountId = bankAccountId;
      }
      await purchasesApi.recordPayment(id, data);
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentNotes('');
      setBankAccountId('');
      fetchPurchase();
    } catch (error) {
      console.error('Failed to record payment:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      {
        variant: 'default' | 'secondary' | 'outline' | 'destructive';
        label: string;
      }
    > = {
      draft: {
        variant: 'secondary',
        label: t('purchases.status.draft', 'Draft'),
      },
      ordered: {
        variant: 'outline',
        label: t('purchases.status.ordered', 'Ordered'),
      },
      received: {
        variant: 'default',
        label: t('purchases.status.received', 'Received'),
      },
      partial: {
        variant: 'secondary',
        label: t('purchases.status.partial', 'Partial'),
      },
      paid: {
        variant: 'default',
        label: t('purchases.status.paid', 'Paid'),
      },
      cancelled: {
        variant: 'destructive',
        label: t('purchases.status.cancelled', 'Cancelled'),
      },
    };
    const c = config[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatCurrency = (amount: string | number | undefined | null) => {
    if (amount === undefined || amount === null || amount === '') return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: purchase?.currency || 'USD',
    }).format(num || 0);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatPaymentMethod = (method: string) =>
    method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const needsBankAccount =
    paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'mobile_money';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!purchase) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <p>{t('purchases.notFound', 'Purchase not found')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/purchases')}>
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
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{purchase.purchaseNumber || 'N/A'}</h1>
                {getStatusBadge(purchase.status)}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground dark:text-slate-400">
                    {t('purchases.detail.supplier', 'Supplier')}
                  </p>
                  <p className="font-medium dark:text-slate-200">
                    {typeof purchase.supplier?.name === 'string' ? purchase.supplier.name : purchase.supplierName || '-'}
                  </p>
                  {purchase.supplier?.contact && typeof purchase.supplier.contact === 'object' && purchase.supplier.contact.contactPerson && (
                    <p className="text-muted-foreground dark:text-slate-400">{purchase.supplier.contact.contactPerson}</p>
                  )}
                  {purchase.supplier?.contact && typeof purchase.supplier.contact === 'string' && (
                    <p className="text-muted-foreground dark:text-slate-400">{purchase.supplier.contact}</p>
                  )}
                  {purchase.supplier?.contact && typeof purchase.supplier.contact === 'object' && purchase.supplier.contact.email && (
                    <p className="text-muted-foreground dark:text-slate-400">{purchase.supplier.contact.email}</p>
                  )}
                  {purchase.supplier?.contact && typeof purchase.supplier.contact === 'object' && purchase.supplier.contact.phone && (
                    <p className="text-muted-foreground dark:text-slate-400">{purchase.supplier.contact.phone}</p>
                  )}
                  {purchase.supplierTin && (
                    <p className="text-muted-foreground dark:text-slate-400">TIN: {purchase.supplierTin}</p>
                  )}
                  {purchase.supplierAddress && (
                    <p className="text-muted-foreground dark:text-slate-400">{purchase.supplierAddress}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-slate-400">
                    {t('purchases.detail.purchaseDate', 'Purchase Date')}
                  </p>
                  <p className="font-medium dark:text-slate-200">{formatDate(purchase.purchaseDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-slate-400">
                    {t('purchases.detail.expectedDelivery', 'Expected Delivery')}
                  </p>
                  <p className="font-medium dark:text-slate-200">{formatDate(purchase.expectedDeliveryDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-slate-400">
                    {t('purchases.detail.paymentTerms', 'Payment Terms')}
                  </p>
                  <p className="font-medium dark:text-slate-200">{formatPaymentMethod(purchase.paymentTerms || '')}</p>
                </div>
                {purchase.supplierInvoiceNumber && (
                  <div>
                    <p className="text-muted-foreground dark:text-slate-400">
                      {t('purchases.detail.supplierInvoice', 'Supplier Invoice #')}
                    </p>
                    <p className="font-medium dark:text-slate-200">{purchase.supplierInvoiceNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground dark:text-slate-400">
                    {t('purchases.detail.currency', 'Currency')}
                  </p>
                  <p className="font-medium dark:text-slate-200">{purchase.currency}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-sm dark:text-slate-400">
                {t('purchases.detail.total', 'Grand Total')}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(purchase.grandTotal)}</p>
              {parseFloat(purchase.balance) > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t('purchases.detail.balance', 'Balance')}: {formatCurrency(purchase.balance)}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t dark:border-slate-600 flex gap-2 flex-wrap">
            {purchase.status === 'draft' && (
              <>
                <Button onClick={handleReceive} disabled={actionLoading}>
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  {t('purchases.detail.receive', 'Receive Stock')}
                </Button>
                <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('purchases.detail.cancel', 'Cancel')}
                </Button>
                <Button variant="outline" onClick={() => navigate(`/purchases/${id}/edit`)}>
                  {t('common.edit', 'Edit')}
                </Button>
              </>
            )}
            {(purchase.status === 'received' || purchase.status === 'partial' || purchase.status === 'ordered') &&
              parseFloat(purchase.balance) > 0 && (
                <Button onClick={handleShowPaymentForm} disabled={actionLoading}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  {t('purchases.detail.recordPayment', 'Record Payment')}
                </Button>
              )}
          </div>
        </div>

        {/* Inline Payment Form */}
        {showPaymentForm && (
          <Card className="mb-6 dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">{t('purchases.detail.recordPayment', 'Record Payment')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-900 dark:text-white">{t('purchases.payment.amount', 'Amount')} *</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-900 dark:text-white">{t('purchases.payment.method', 'Payment Method')} *</Label>
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
                {needsBankAccount && (
                  <div>
                    <Label className="text-slate-900 dark:text-white">{t('purchases.payment.bankAccount', 'Bank Account')}</Label>
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
                <div>
                  <Label>{t('purchases.payment.reference', 'Reference')}</Label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Payment reference"
                  />
                </div>
              </div>
              <div>
                <Label>{t('purchases.payment.notes', 'Notes')}</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Payment notes"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleRecordPayment} disabled={paymentLoading || !paymentAmount}>
                  {paymentLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <DollarSign className="mr-2 h-4 w-4" />
                  )}
                  {t('purchases.payment.submit', 'Submit Payment')}
                </Button>
                <Button variant="outline" onClick={() => setShowPaymentForm(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="dark:bg-slate-800">
            <TabsTrigger value="details" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              {t('purchases.detail.tabs.details', 'Items')}
            </TabsTrigger>
            <TabsTrigger value="payments" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              {t('purchases.detail.tabs.payments', 'Payments')}
              {purchase.payments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {purchase.payments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('purchases.detail.lineItems', 'Line Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700">
                      <TableHead className="dark:text-white">{t('purchases.detail.product', 'Product')}</TableHead>
                      <TableHead className="text-right dark:text-white">
                        {t('purchases.detail.qty', 'Qty')}
                      </TableHead>
                      <TableHead className="text-right dark:text-white">
                        {t('purchases.detail.unitCost', 'Unit Cost')}
                      </TableHead>
                      <TableHead className="text-right dark:text-white">
                        {t('purchases.detail.tax', 'Tax')}
                      </TableHead>
                      <TableHead className="text-right dark:text-white">
                        {t('purchases.detail.total', 'Total')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.items?.map((item, idx) => (
                      <TableRow key={idx} className="dark:hover:bg-slate-700/50">
                        <TableCell>
                          <p className="font-medium dark:text-slate-200">{typeof item.product?.name === 'string' ? item.product.name : '-'}</p>
                          <p className="text-sm text-muted-foreground dark:text-slate-400">{typeof item.product?.sku === 'string' ? item.product.sku : ''}</p>
                        </TableCell>
                        <TableCell className="text-right dark:text-slate-300">{item.quantity}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{formatCurrency(item.unitCost)}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{formatCurrency(item.taxAmount)}</TableCell>
                        <TableCell className="text-right font-medium dark:text-slate-200">
                          {formatCurrency(item.totalWithTax)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Summary */}
                <div className="mt-4 pt-4 border-t dark:border-slate-600 flex justify-end gap-8">
                  <div className="text-right">
                    <p className="text-muted-foreground dark:text-slate-400">
                      {t('purchases.detail.subtotal', 'Subtotal')}
                    </p>
                    <p className="font-medium dark:text-slate-200">{formatCurrency(purchase.subtotal)}</p>
                  </div>
                  {parseFloat(purchase.totalDiscount) > 0 && (
                    <div className="text-right">
                      <p className="text-muted-foreground dark:text-slate-400">
                        {t('purchases.detail.discount', 'Discount')}
                      </p>
                      <p className="font-medium dark:text-slate-200">-{formatCurrency(purchase.totalDiscount)}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-muted-foreground dark:text-slate-400">{t('purchases.detail.tax', 'Tax')}</p>
                    <p className="font-medium dark:text-slate-200">{formatCurrency(purchase.totalTax)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {t('purchases.detail.grandTotal', 'Grand Total')}
                    </p>
                    <p className="font-bold text-lg text-slate-900 dark:text-white">{formatCurrency(purchase.grandTotal)}</p>
                  </div>
                </div>

                {purchase.notes && (
                  <div className="mt-4 pt-4 border-t dark:border-slate-600">
                    <p className="text-muted-foreground text-sm dark:text-slate-400">
                      {t('purchases.detail.notes', 'Notes')}
                    </p>
                    <p className="dark:text-slate-200">{purchase.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">
                  {t('purchases.detail.paymentHistory', 'Payment History')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!purchase.payments || purchase.payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                    <DollarSign className="mx-auto h-8 w-8 mb-2" />
                    <p>
                      {t('purchases.detail.noPayments', 'No payments recorded')}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700">
                        <TableHead className="dark:text-white">{t('purchases.detail.paidDate', 'Date')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchases.detail.method', 'Method')}</TableHead>
                        <TableHead className="dark:text-white">{t('purchases.detail.reference', 'Reference')}</TableHead>
                        <TableHead className="text-right dark:text-white">
                          {t('purchases.detail.amount', 'Amount')}
                        </TableHead>
                        <TableHead className="dark:text-white">{t('purchases.detail.recordedBy', 'Recorded By')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchase.payments.map((payment, idx) => (
                        <TableRow key={idx} className="dark:hover:bg-slate-700/50">
                          <TableCell className="dark:text-slate-300">{formatDate(payment.paidDate)}</TableCell>
                          <TableCell className="dark:text-slate-300">{formatPaymentMethod(payment.paymentMethod)}</TableCell>
                          <TableCell className="dark:text-slate-300">{payment.reference || '-'}</TableCell>
                          <TableCell className="text-right font-medium dark:text-slate-200">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="dark:text-slate-300">{payment.recordedBy?.name || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Payment Summary */}
                <div className="mt-4 pt-4 border-t dark:border-slate-600 flex justify-end gap-8">
                  <div className="text-right">
                    <p className="text-muted-foreground dark:text-slate-400">
                      {t('purchases.detail.totalPaid', 'Total Paid')}
                    </p>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(purchase.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground dark:text-slate-400">
                      {t('purchases.detail.balance', 'Balance')}
                    </p>
                    <p
                      className={`font-medium ${
                        (Number(purchase.grandTotal) - (purchase.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0)) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {formatCurrency(Number(purchase.grandTotal) - (purchase.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
