import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { invoicesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
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
    qtyOrdered: number;
    qtyReceived: number;
    unitCost: number;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
  }>;
  payments?: Array<{
    _id: string;
    amount: number;
    paymentMethod: string;
    recordedAt: string;
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
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [creditNotes] = useState<CreditNote[]>([]);
  const [deliveryNotes] = useState<DeliveryNote[]>([]);

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

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

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
    // TODO: Open payment dialog
    const amount = prompt(t('invoice.enterPaymentAmount', 'Enter payment amount:'));
    if (!amount) return;
    
    const method = prompt(t('invoice.enterPaymentMethod', 'Enter payment method (cash, card, bank_transfer, cheque, mobile_money):'));
    if (!method) return;
    
    setActionLoading(true);
    invoicesApi.recordPayment(id!, {
      amount: parseFloat(amount),
      paymentMethod: method as any
    }).then(() => {
      fetchInvoice();
    }).catch(error => {
      console.error('Failed to record payment:', error);
    }).finally(() => {
      setActionLoading(false);
    });
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

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
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
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/invoices')}>
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
                  {invoice.referenceNo || invoice.invoiceNumber || 'N/A'}
                </h1>
                {getStatusBadge(invoice.status)}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('invoice.client', 'Client')}</p>
                  <p className="font-medium">{invoice.client?.name || '-'}</p>
                  {invoice.client?.contact?.phone && <p className="text-muted-foreground">{invoice.client.contact.phone}</p>}
                  {invoice.client?.contact?.email && <p className="text-muted-foreground">{invoice.client.contact.email}</p>}
                  {invoice.client?.contact?.address && <p className="text-muted-foreground">{invoice.client.contact.address}</p>}
                  {invoice.client?.taxId && <p className="text-muted-foreground">TIN: {invoice.client.taxId}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground">{t('invoice.paymentTerms', 'Payment Terms')}</p>
                  <p className="font-medium">{invoice.paymentTerms || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('invoice.invoiceDate', 'Invoice Date')}</p>
                  <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('invoice.dueDate', 'Due Date')}</p>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-sm">{t('invoice.total', 'Total Amount')}</p>
              <p className="text-2xl font-bold">
                {formatCurrency(invoice.grandTotal, invoice.currencyCode)}
              </p>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-medium mb-3">{t('invoice.statusTimeline', 'Status Timeline')}</p>
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
              {invoice.status === 'cancelled' && (
                <Badge variant="destructive" className="ml-4">
                  {t('invoice.status.cancelled', 'Cancelled')}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t flex gap-2">
            {invoice.status === 'draft' && (
              <>
                <Button onClick={handleConfirm} disabled={actionLoading}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('invoice.confirm', 'Confirm')}
                </Button>
                <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('invoice.cancel', 'Cancel')}
                </Button>
              </>
            )}
            {(invoice.status === 'confirmed' || invoice.status === 'partially_paid' || invoice.status === 'partial') && (
              <Button onClick={handleRecordPayment} disabled={actionLoading}>
                <DollarSign className="mr-2 h-4 w-4" />
                {t('invoice.recordPayment', 'Record Payment')}
              </Button>
            )}
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              {t('invoice.downloadPDF', 'Download PDF')}
            </Button>
            {invoice.status !== 'draft' && invoice.status !== 'cancelled' && (
              <Button variant="outline" onClick={handleSendEmail}>
                <Send className="mr-2 h-4 w-4" />
                {t('invoice.sendEmail', 'Send by Email')}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">{t('invoice.tabs.details', 'Details')}</TabsTrigger>
            <TabsTrigger value="payments">
              {t('invoice.tabs.payments', 'Payments')}
              {invoice.payments && invoice.payments.length > 0 && (
                <Badge variant="secondary" className="ml-2">{invoice.payments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="creditNotes">{t('invoice.tabs.creditNotes', 'Credit Notes')}</TabsTrigger>
            <TabsTrigger value="deliveries">{t('invoice.tabs.deliveries', 'Deliveries')}</TabsTrigger>
            <TabsTrigger value="journal">{t('invoice.tabs.journal', 'Journal Entries')}</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>{t('invoice.lineItems', 'Line Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableRow>
                    <TableHead>{t('invoice.product', 'Product')}</TableHead>
                    <TableHead className="text-right">{t('invoice.qty', 'Qty')}</TableHead>
                    <TableHead className="text-right">{t('invoice.unitPrice', 'Unit Price')}</TableHead>
                    <TableHead className="text-right">{t('invoice.discount', 'Discount')}</TableHead>
                    <TableHead className="text-right">{t('invoice.tax', 'Tax')}</TableHead>
                    <TableHead className="text-right">{t('invoice.total', 'Total')}</TableHead>
                  </TableRow>
                  <TableBody>
                    {invoice.lines?.map((line) => (
                      <TableRow key={line._id}>
                        <TableCell>
                          <div className="font-medium">{line.product?.name || '-'}</div>
                          <div className="text-sm text-muted-foreground">{line.product?.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">{line.qtyOrdered || line.qtyReceived || 0}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.unitCost, invoice.currencyCode)}</TableCell>
                        <TableCell className="text-right">0%</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.taxAmount, invoice.currencyCode)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(line.lineTotal, invoice.currencyCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="flex justify-end mt-4">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('invoice.subtotal', 'Subtotal')}</span>
                      <span className="font-medium">{formatCurrency(invoice.subtotal, invoice.currencyCode)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('invoice.tax', 'Tax')}</span>
                      <span className="font-medium">{formatCurrency(invoice.totalTax, invoice.currencyCode)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold">{t('invoice.total', 'Total')}</span>
                      <span className="font-bold text-lg">{formatCurrency(invoice.grandTotal, invoice.currencyCode)}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-muted-foreground">{t('invoice.amountPaid', 'Amount Paid')}</span>
                      <span className="font-medium text-green-600">{formatCurrency(invoice.amountPaid, invoice.currencyCode)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">{t('invoice.amountOutstanding', 'Outstanding')}</span>
                      <span className="font-bold">{formatCurrency(invoice.balance || invoice.amountOutstanding || 0, invoice.currencyCode)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-muted-foreground text-sm">{t('invoice.notes', 'Notes')}</p>
                    <p>{invoice.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>{t('invoice.payments', 'Payment History')}</CardTitle>
              </CardHeader>
              <CardContent>
                {invoice.payments && invoice.payments.length > 0 ? (
                  <Table>
                    <TableRow>
                      <TableHead>{t('invoice.paymentDate', 'Date')}</TableHead>
                      <TableHead>{t('invoice.paymentMethod', 'Method')}</TableHead>
                      <TableHead>{t('invoice.reference', 'Reference')}</TableHead>
                      <TableHead>{t('invoice.recordedBy', 'Recorded By')}</TableHead>
                      <TableHead className="text-right">{t('invoice.amount', 'Amount')}</TableHead>
                    </TableRow>
                    <TableBody>
                      {invoice.payments.map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell>{formatDate(payment.recordedAt)}</TableCell>
                          <TableCell className="capitalize">{payment.paymentMethod?.replace('_', ' ')}</TableCell>
                          <TableCell>{payment.reference || '-'}</TableCell>
                          <TableCell>{payment.recordedBy?.name || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount, invoice.currencyCode)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('invoice.noPayments', 'No payments recorded yet')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credit Notes Tab */}
          <TabsContent value="creditNotes">
            <Card>
              <CardHeader>
                <CardTitle>{t('invoice.creditNotes', 'Credit Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                {creditNotes.length > 0 ? (
                  <Table>
                    <TableRow>
                      <TableHead>{t('invoice.reference', 'Reference')}</TableHead>
                      <TableHead>{t('invoice.date', 'Date')}</TableHead>
                      <TableHead>{t('invoice.status', 'Status')}</TableHead>
                      <TableHead className="text-right">{t('invoice.amount', 'Amount')}</TableHead>
                    </TableRow>
                    <TableBody>
                      {creditNotes.map((cn) => (
                        <TableRow key={cn._id}>
                          <TableCell className="font-medium">{cn.referenceNo || cn.creditNoteNumber}</TableCell>
                          <TableCell>{formatDate(cn.createdAt)}</TableCell>
                          <TableCell>{cn.status}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(cn.grandTotal, invoice.currencyCode)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('invoice.noCreditNotes', 'No credit notes for this invoice')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            <Card>
              <CardHeader>
                <CardTitle>{t('invoice.deliveries', 'Delivery Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                {deliveryNotes.length > 0 ? (
                  <Table>
                    <TableRow>
                      <TableHead>{t('invoice.reference', 'Reference')}</TableHead>
                      <TableHead>{t('invoice.date', 'Date')}</TableHead>
                      <TableHead>{t('invoice.status', 'Status')}</TableHead>
                      <TableHead className="text-right">{t('invoice.amount', 'Amount')}</TableHead>
                    </TableRow>
                    <TableBody>
                      {deliveryNotes.map((dn) => (
                        <TableRow key={dn._id}>
                          <TableCell className="font-medium">{dn.referenceNo || dn.deliveryNoteNumber}</TableCell>
                          <TableCell>{formatDate(dn.createdAt)}</TableCell>
                          <TableCell>{dn.status}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(dn.grandTotal, invoice.currencyCode)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('invoice.noDeliveries', 'No delivery notes for this invoice')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Journal Entries Tab */}
          <TabsContent value="journal">
            <Card>
              <CardHeader>
                <CardTitle>{t('invoice.journalEntries', 'Journal Entries')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoice.revenueJournalEntry && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{t('invoice.revenueEntry', 'Revenue Entry')}</p>
                        <p className="text-sm text-muted-foreground">
                          Entry #: {invoice.revenueJournalEntry.entryNumber}
                        </p>
                      </div>
                      <Badge variant="outline">Posted</Badge>
                    </div>
                  )}
                  {invoice.cogsJournalEntry && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{t('invoice.cogsEntry', 'COGS Entry')}</p>
                        <p className="text-sm text-muted-foreground">
                          Entry #: {invoice.cogsJournalEntry.entryNumber}
                        </p>
                      </div>
                      <Badge variant="outline">Posted</Badge>
                    </div>
                  )}
                  {!invoice.revenueJournalEntry && !invoice.cogsJournalEntry && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="mx-auto h-8 w-8 mb-2" />
                      <p>{t('invoice.noJournalEntries', 'No journal entries posted yet')}</p>
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