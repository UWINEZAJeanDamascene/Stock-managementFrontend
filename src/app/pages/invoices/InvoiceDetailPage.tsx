import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { invoicesApi, bankAccountsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  FileText,
  Clock,
  Loader2,
  Truck,
  CreditCard,
  Download,
  Send,
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
  TableRow 
} from '@/app/components/ui/table';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
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
      email?: string;
      address?: string;
    };
    taxId?: string;
  };
  invoiceDate: string;
  dueDate: string;
  status: 'draft' | 'confirmed' | 'partially_paid' | 'fully_paid' | 'cancelled' | 'partial' | 'paid';
  currencyCode: string;
  subtotal: number;
  totalTax: number;
  taxAmount?: number;
  grandTotal: number;
  amountPaid: number;
  balance: number;
  amountOutstanding?: number;
  notes?: string;
  paymentTerms?: string;
  createdBy?: {
    name: string;
    email: string;
  };
  confirmedBy?: {
    name: string;
    email: string;
  };
  confirmedDate?: string;
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
    qty?: number;
    quantity?: number;
    unitPrice?: number;
    unitCost?: number;
    taxRate: number;
    taxAmount?: number;
    lineTax?: number;
    lineTotal?: number;
    lineSubtotal?: number;
  }>;
  payments?: Array<{
    _id: string;
    amount: number;
    paymentMethod: string;
    recordedAt?: string;
    paidDate?: string;
    recordedBy?: {
      name: string;
      email: string;
    };
    reference?: string;
    notes?: string;
  }>;
  revenueJournalEntry?: {
    _id: string;
    entryNumber: string;
  };
  cogsJournalEntry?: {
    _id: string;
    entryNumber: string;
  };
}

interface CreditNote {
  _id: string;
  referenceNo: string;
  creditNoteNumber?: string;
  createdAt: string;
  grandTotal: number;
  status: string;
}

interface DeliveryNote {
  _id: string;
  referenceNo: string;
  deliveryNoteNumber?: string;
  createdAt: string;
  grandTotal: number;
  status: string;
}

const STATUS_FLOW = [
  { status: 'draft', label: 'Draft' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'partially_paid', label: 'Partially Paid' },
  { status: 'fully_paid', label: 'Fully Paid' },
];

export default function InvoiceDetailPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [creditNotes] = useState<CreditNote[]>([]);
  const [deliveryNotes] = useState<DeliveryNote[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState<Array<{_id: string; name: string; accountType: string}>>([]);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await invoicesApi.getById(id);
      if (response.success) {
        setInvoice(response.data as Invoice);
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  useEffect(() => {
    fetchInvoice();
    fetchBankAccounts();
  }, [fetchInvoice, fetchBankAccounts]);

  const handleConfirm = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await invoicesApi.confirm(id);
      fetchInvoice();
    } catch (error) {
      console.error('Failed to confirm:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm(t('invoice.cancelConfirm', 'Are you sure you want to cancel this invoice?'))) {
      return;
    }
    setActionLoading(true);
    try {
      await invoicesApi.cancel(id);
      fetchInvoice();
    } catch (error) {
      console.error('Failed to cancel:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPayment = () => {
    setPaymentAmount(invoice?.balance?.toString() || invoice?.amountOutstanding?.toString() || '');
    setPaymentReference('');
    setPaymentMethod('cash');
    setBankAccountId('');
    setShowPaymentDialog(true);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentAmount || !id) return;
    setActionLoading(true);
    try {
      const data: { amount: number; paymentMethod: any; reference?: string; bankAccountId?: string } = {
        amount: parseFloat(paymentAmount),
        paymentMethod: paymentMethod as any,
        reference: paymentReference || undefined
      };
      if (
        (paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'mobile_money') &&
        bankAccountId
      ) {
        data.bankAccountId = bankAccountId;
      }
      await invoicesApi.recordPayment(id, data);
      setShowPaymentDialog(false);
      setBankAccountId('');
      fetchInvoice();
    } catch (error) {
      console.error('Failed to record payment:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!id) return;
    try {
      const blob = await invoicesApi.getPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.referenceNo || invoice?.invoiceNumber || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };

  const handleSendEmail = async () => {
    if (!id) return;
    try {
      await invoicesApi.sendEmail(id);
      alert(t('invoice.emailSent', 'Invoice sent successfully'));
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: t('invoice.status.draft', 'Draft') },
      confirmed: { variant: 'default', label: t('invoice.status.confirmed', 'Confirmed') },
      partially_paid: { variant: 'outline', label: t('invoice.status.partially_paid', 'Partially Paid') },
      partial: { variant: 'outline', label: t('invoice.status.partially_paid', 'Partially Paid') },
      fully_paid: { variant: 'default', label: t('invoice.status.fully_paid', 'Fully Paid') },
      paid: { variant: 'default', label: t('invoice.status.fully_paid', 'Paid') },
      cancelled: { variant: 'destructive', label: t('invoice.status.cancelled', 'Cancelled') },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusStep = (status: string) => {
    if (status === 'cancelled') return -1;
    const stepIndex = STATUS_FLOW.findIndex(s => s.status === status);
    return stepIndex;
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

  if (!invoice) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <p>Invoice not found</p>
        </div>
      </Layout>
    );
  }

  const currentStatusStep = getStatusStep(invoice.status);

  return (
    <Layout>
      <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/invoices')} className="dark:text-gray-300 px-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{t('common.back', 'Back')}</span>
          </Button>
        </div>

        {/* Document Header */}
        <div className="bg-card rounded-lg border p-4 sm:p-6 mb-4 sm:mb-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                <h1 className="text-xl sm:text-2xl font-bold dark:text-gray-100 truncate">
                  {invoice.referenceNo || invoice.invoiceNumber || 'N/A'}
                </h1>
                <div className="flex-shrink-0">
                  {getStatusBadge(invoice.status)}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">{t('invoice.client', 'Client')}</p>
                  <p className="font-medium dark:text-gray-200">{invoice.client?.name || '-'}</p>
                  {invoice.client?.contact?.phone && <p className="text-muted-foreground dark:text-gray-400 text-xs">{invoice.client.contact.phone}</p>}
                  {invoice.client?.contact?.email && <p className="text-muted-foreground dark:text-gray-400 text-xs">{invoice.client.contact.email}</p>}
                  {invoice.client?.contact?.address && <p className="text-muted-foreground dark:text-gray-400 text-xs">{invoice.client.contact.address}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">{t('invoice.paymentTerms', 'Payment Terms')}</p>
                  <p className="font-medium dark:text-gray-200">{invoice.paymentTerms || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">{t('invoice.invoiceDate', 'Invoice Date')}</p>
                  <p className="font-medium dark:text-gray-200">{formatDate(invoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">{t('invoice.dueDate', 'Due Date')}</p>
                  <p className="font-medium dark:text-gray-200">{formatDate(invoice.dueDate)}</p>
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
              <p className="text-muted-foreground text-sm dark:text-gray-400">{t('invoice.total', 'Total')}</p>
              <p className="text-xl sm:text-2xl font-bold dark:text-gray-100 whitespace-nowrap">
                {formatCurrency(invoice.grandTotal)}
              </p>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t dark:border-slate-700">
            <p className="text-sm font-medium mb-3 dark:text-gray-300">{t('invoice.statusTimeline', 'Status Timeline')}</p>
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
              {STATUS_FLOW.map((step, index) => (
                <div key={step.status} className="flex items-center flex-shrink-0">
                  <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm ${
                    index <= currentStatusStep 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground dark:bg-slate-700 dark:text-gray-400'
                  }`}>
                    {index < currentStatusStep ? (
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : index === currentStatusStep ? (
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <div className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.label.split(' ')[0]}</span>
                  </div>
                  {index < STATUS_FLOW.length - 1 && (
                    <div className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 ${
                      index < currentStatusStep ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
              {invoice.status === 'cancelled' && (
                <Badge variant="destructive" className="ml-2 sm:ml-4 flex-shrink-0">
                  {t('invoice.status.cancelled', 'Cancelled')}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t dark:border-slate-700 flex flex-wrap gap-2">
            {invoice.status === 'draft' && (
              <>
                <Button size="sm" onClick={handleConfirm} disabled={actionLoading} className="flex-1 sm:flex-none justify-center">
                  <CheckCircle className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">{t('invoice.confirm', 'Confirm')}</span>
                  <span className="sm:hidden">Confirm</span>
                </Button>
                <Button size="sm" variant="destructive" onClick={handleCancel} disabled={actionLoading} className="flex-1 sm:flex-none justify-center">
                  <XCircle className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">{t('invoice.cancel', 'Cancel')}</span>
                  <span className="sm:hidden">Cancel</span>
                </Button>
              </>
            )}
            {(invoice.status === 'confirmed' || invoice.status === 'partially_paid' || invoice.status === 'partial') && (
              <Button size="sm" onClick={handleRecordPayment} disabled={actionLoading} className="flex-1 sm:flex-none justify-center">
                <DollarSign className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t('invoice.recordPayment', 'Record Payment')}</span>
                <span className="sm:hidden">Pay</span>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleDownloadPDF} className="flex-1 sm:flex-none justify-center">
              <Download className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('invoice.downloadPDF', 'Download PDF')}</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            {invoice.status !== 'draft' && invoice.status !== 'cancelled' && (
              <Button size="sm" variant="outline" onClick={handleSendEmail} className="flex-1 sm:flex-none justify-center">
                <Send className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t('invoice.sendEmail', 'Send by Email')}</span>
                <span className="sm:hidden">Email</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="dark:bg-slate-800 grid grid-cols-5 w-full h-auto p-1 gap-1">
            <TabsTrigger value="details" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-gray-100 dark:text-gray-300 text-xs sm:text-sm px-2 sm:px-3 py-1.5 w-full">
              {t('invoice.tabs.details', 'Details') || 'Details'}
            </TabsTrigger>
            <TabsTrigger value="payments" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-gray-100 dark:text-gray-300 text-xs sm:text-sm px-2 sm:px-3 py-1.5 w-full">
              <span className="hidden sm:inline">{t('invoice.tabs.payments', 'Payments') || 'Payments'}</span>
              <span className="sm:hidden">Pay</span>
              {invoice.payments && invoice.payments.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{invoice.payments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="creditNotes" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-gray-100 dark:text-gray-300 text-xs sm:text-sm px-2 sm:px-3 py-1.5 w-full">
              <span className="hidden sm:inline">{t('invoice.tabs.creditNotes', 'Credit Notes') || 'Credit Notes'}</span>
              <span className="sm:hidden">Credit</span>
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-gray-100 dark:text-gray-300 text-xs sm:text-sm px-2 sm:px-3 py-1.5 w-full">
              <span className="hidden sm:inline">{t('invoice.tabs.deliveries', 'Deliveries') || 'Deliveries'}</span>
              <span className="sm:hidden">Deliv</span>
            </TabsTrigger>
            <TabsTrigger value="journal" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-gray-100 dark:text-gray-300 text-xs sm:text-sm px-2 sm:px-3 py-1.5 w-full">
              <span className="hidden sm:inline">{t('invoice.tabs.journal', 'Journal') || 'Journal'}</span>
              <span className="sm:hidden">Jrnl</span>
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">{t('invoice.lineItems', 'Line Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableRow className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.product', 'Product')}</TableHead>
                    <TableHead className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.qty', 'Qty')}</TableHead>
                    <TableHead className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.unitPrice', 'Unit Price')}</TableHead>
                    <TableHead className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.discount', 'Discount')}</TableHead>
                    <TableHead className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.tax', 'Tax')}</TableHead>
                    <TableHead className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.total', 'Total')}</TableHead>
                  </TableRow>
                  <TableBody className="dark:bg-slate-800">
                    {invoice.lines?.map((line) => (
                      <TableRow key={line._id} className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                        <TableCell className="dark:bg-slate-800 dark:border-b dark:border-slate-700">
                          <div className="font-medium dark:text-gray-200">{line.product?.name || '-'}</div>
                          <div className="text-sm text-muted-foreground dark:text-gray-400">{line.product?.sku}</div>
                        </TableCell>
                        <TableCell className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{line.qty || line.quantity || 0}</TableCell>
                        <TableCell className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{formatCurrency(line.unitPrice || 0)}</TableCell>
                        <TableCell className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">-</TableCell>
                        <TableCell className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{formatCurrency(line.lineTax || line.taxAmount || 0)}</TableCell>
                        <TableCell className="text-right font-medium dark:text-gray-200 dark:bg-slate-800 dark:border-b dark:border-slate-700">{formatCurrency(line.lineTotal || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="flex justify-end mt-4">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground dark:text-gray-400">{t('invoice.subtotal', 'Subtotal')}</span>
                      <span className="font-medium dark:text-gray-200">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground dark:text-gray-400">{t('invoice.tax', 'Tax')}</span>
                      <span className="font-medium dark:text-gray-200">{formatCurrency(
                        (() => {
                          const tax = invoice.totalTax as any;
                          if (tax && typeof tax === 'object') {
                            return parseFloat(tax.$numberDecimal || tax.toString?.() || 0);
                          }
                          return parseFloat(String(tax ?? invoice.taxAmount ?? 0));
                        })()
                      )}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 dark:border-slate-700">
                      <span className="font-bold dark:text-gray-100">{t('invoice.total', 'Total')}</span>
                      <span className="font-bold text-lg dark:text-gray-100">{formatCurrency(invoice.grandTotal)}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-muted-foreground dark:text-gray-400">{t('invoice.amountPaid', 'Amount Paid')}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 dark:border-slate-700">
                      <span className="font-medium dark:text-gray-200">{t('invoice.amountOutstanding', 'Outstanding')}</span>
                      <span className="font-bold dark:text-gray-100">{formatCurrency(invoice.balance || invoice.amountOutstanding || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="mt-4 pt-4 border-t dark:border-slate-700">
                    <p className="text-muted-foreground text-sm dark:text-gray-400">{t('invoice.notes', 'Notes')}</p>
                    <p className="dark:text-gray-200">{invoice.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">{t('invoice.payments', 'Payment History')}</CardTitle>
              </CardHeader>
              <CardContent>
                {invoice.payments && invoice.payments.length > 0 ? (
                  <Table>
                    <TableRow className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                      <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.paymentDate', 'Date') || 'Date'}</TableHead>
                      <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.paymentMethod', 'Method') || 'Method'}</TableHead>
                      <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.reference', 'Reference') || 'Reference'}</TableHead>
                      <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.recordedBy', 'Recorded By') || 'Recorded By'}</TableHead>
                      <TableHead className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.amount', 'Amount') || 'Amount'}</TableHead>
                    </TableRow>
                    <TableBody className="dark:bg-slate-800">
                      {invoice.payments.map((payment) => (
                        <TableRow key={payment._id} className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                          <TableCell className="dark:text-gray-300 dark:bg-slate-800">{formatDate(payment.paidDate || payment.recordedAt || '')}</TableCell>
                          <TableCell className="capitalize dark:text-gray-300">{payment.paymentMethod?.replace('_', ' ')}</TableCell>
                          <TableCell className="dark:text-gray-300">{payment.reference || '-'}</TableCell>
                          <TableCell className="dark:text-gray-300">{payment.recordedBy?.name ?? '-'}</TableCell>
                          <TableCell className="text-right font-medium dark:text-gray-200">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground dark:text-gray-400">
                    <DollarSign className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('invoice.noPayments', 'No payments recorded yet')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credit Notes Tab */}
          <TabsContent value="creditNotes">
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">{t('invoice.creditNotes', 'Credit Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                {creditNotes.length > 0 ? (
                  <Table>
                    <TableRow className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                      <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.reference', 'Reference')}</TableHead>
                      <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.date', 'Date')}</TableHead>
                      <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.status', 'Status')}</TableHead>
                      <TableHead className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.amount', 'Amount')}</TableHead>
                    </TableRow>
                    <TableBody className="dark:bg-slate-800">
                      {creditNotes.map((cn) => (
                        <TableRow key={cn._id} className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                          <TableCell className="font-medium dark:text-gray-200">{cn.referenceNo || cn.creditNoteNumber}</TableCell>
                          <TableCell className="dark:text-gray-300">{formatDate(cn.createdAt)}</TableCell>
                          <TableCell className="dark:text-gray-300">{cn.status}</TableCell>
                          <TableCell className="text-right font-medium dark:text-gray-200">
                            {formatCurrency(cn.grandTotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground dark:text-gray-400">
                    <CreditCard className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('invoice.noCreditNotes', 'No credit notes for this invoice')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="dark:text-gray-100">{t('invoice.deliveries', 'Delivery Notes')}</CardTitle>
                <Button variant="outline" onClick={() => navigate(`/delivery-notes/new?invoice=${id}`)}>
                  <Truck className="mr-2 h-4 w-4" />
                  {t('invoice.newDeliveryNote', 'New Delivery Note')}
                </Button>
              </CardHeader>
              <CardContent>
                {deliveryNotes.length > 0 ? (
                  <Table>
                    <TableRow className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                      <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.reference', 'Reference')}</TableHead>
                      <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.date', 'Date')}</TableHead>
                      <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.status', 'Status')}</TableHead>
                      <TableHead className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.amount', 'Amount')}</TableHead>
                    </TableRow>
                    <TableBody className="dark:bg-slate-800">
                      {deliveryNotes.map((dn) => (
                        <TableRow key={dn._id} className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                          <TableCell className="font-medium dark:text-gray-200">{dn.referenceNo || dn.deliveryNoteNumber}</TableCell>
                          <TableCell className="dark:text-gray-300">{formatDate(dn.createdAt)}</TableCell>
                          <TableCell className="dark:text-gray-300">{dn.status}</TableCell>
                          <TableCell className="text-right font-medium dark:text-gray-200">
                            {formatCurrency(dn.grandTotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground dark:text-gray-400">
                    <Truck className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('invoice.noDeliveries', 'No delivery notes for this invoice')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Journal Entries Tab */}
          <TabsContent value="journal">
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">{t('invoice.journalEntries', 'Journal Entries')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoice.revenueJournalEntry && (
                    <div className="flex items-center justify-between p-4 border rounded-lg dark:border-slate-700 dark:bg-slate-800/50">
                      <div>
                        <p className="font-medium dark:text-gray-200">{t('invoice.revenueEntry', 'Revenue Entry')}</p>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">
                          Entry #: {invoice.revenueJournalEntry.entryNumber}
                        </p>
                      </div>
                      <Badge variant="outline" className="dark:border-slate-600 dark:text-gray-300">Posted</Badge>
                    </div>
                  )}
                  {invoice.cogsJournalEntry && (
                    <div className="flex items-center justify-between p-4 border rounded-lg dark:border-slate-700 dark:bg-slate-800/50">
                      <div>
                        <p className="font-medium dark:text-gray-200">{t('invoice.cogsEntry', 'COGS Entry')}</p>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">
                          Entry #: {invoice.cogsJournalEntry.entryNumber}
                        </p>
                      </div>
                      <Badge variant="outline" className="dark:border-slate-600 dark:text-gray-300">Posted</Badge>
                    </div>
                  )}
                  {!invoice.revenueJournalEntry && !invoice.cogsJournalEntry && (
                    <div className="text-center py-8 text-muted-foreground dark:text-gray-400">
                      <FileText className="mx-auto h-8 w-8 mb-2" />
                      <p>{t('invoice.noJournalEntries', 'No journal entries posted yet')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="dark:border-slate-700 dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-gray-100">{t('invoice.recordPayment', 'Record Payment')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="dark:text-gray-200">{t('invoice.amount', 'Amount')}</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method" className="dark:text-gray-200">{t('invoice.paymentMethod', 'Payment Method')}</Label>
                <select
                  id="method"
                  className="w-full h-10 px-3 border rounded-md bg-background dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference" className="dark:text-gray-200">{t('invoice.reference', 'Reference')}</Label>
                <Input
                  id="reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Optional reference"
                  className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                />
              </div>
              {(paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'mobile_money') && (
                <div className="space-y-2">
                  <Label htmlFor="bankAccount" className="dark:text-gray-200">{t('invoice.bankAccount', 'Bank Account')}</Label>
                  <Select value={bankAccountId} onValueChange={setBankAccountId}>
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="dark:border-slate-600 dark:text-gray-300">
                Cancel
              </Button>
              <Button onClick={handlePaymentSubmit} disabled={actionLoading || !paymentAmount}>
                {actionLoading ? 'Processing...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}