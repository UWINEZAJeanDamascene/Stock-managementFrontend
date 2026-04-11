import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { clientsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  Pencil,
  FileText,
  Loader2,
  Download,
  Plus
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import { useTranslation } from 'react-i18next';

interface Client {
  _id: string;
  name: string;
  code: string;
  type: 'individual' | 'company';
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  paymentTerms: string;
  creditLimit: number;
  outstandingBalance: number;
  totalPurchases: number;
  lastPurchaseDate: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

interface Invoice {
  _id: string;
  referenceNo: string;
  invoiceDate: string;
  dueDate: string;
  grandTotal: number;
  amountPaid: number;
  balance: number;
  status: string;
}

interface CreditNote {
  _id: string;
  referenceNo: string;
  creditNoteDate: string;
  grandTotal: number;
  status: string;
}

interface Receipt {
  _id: string;
  referenceNo: string;
  receiptDate: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

interface Quotation {
  _id: string;
  referenceNo: string;
  quotationDate: string;
  expiryDate: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  totalAmount: number;
}

export default function ClientDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState({ totalAmount: 0, totalPaid: 0, totalBalance: 0 });

  useEffect(() => {
    if (id) {
      fetchClient(id);
      fetchInvoices(id);
      fetchCreditNotes(id);
      fetchReceipts(id);
      fetchQuotations(id);
    }
  }, [id]);

  const fetchClient = async (clientId: string) => {
    try {
      const response = await clientsApi.getById(clientId);
      if (response.success && response.data) {
        setClient(response.data as Client);
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async (clientId: string) => {
    try {
      const response = await clientsApi.getInvoices(clientId, { limit: 50 });
      if (response.success) {
        setInvoices(response.data as Invoice[]);
        if (response.summary) {
          const summaryWithTypes = response.summary as unknown as { totalAmount: number; totalPaid: number; totalBalance: number };
          setInvoiceSummary(summaryWithTypes);
        }
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  const fetchCreditNotes = async (clientId: string) => {
    try {
      const response = await clientsApi.getCreditNotes(clientId, { limit: 50 });
      if (response.success) {
        setCreditNotes(response.data as CreditNote[]);
      }
    } catch (error) {
      console.error('Failed to fetch credit notes:', error);
    }
  };

  const fetchReceipts = async (clientId: string) => {
    try {
      const response = await clientsApi.getReceipts(clientId, { limit: 50 });
      if (response.success) {
        setReceipts(response.data as Receipt[]);
      }
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
    }
  };

  const fetchQuotations = async (clientId: string) => {
    try {
      const response = await clientsApi.getQuotations(clientId, { limit: 50 });
      if (response.success) {
        setQuotations(response.data as Quotation[]);
      }
    } catch (error) {
      console.error('Failed to fetch quotations:', error);
    }
  };

  const handleDownloadStatement = async () => {
    if (!id) return;
    try {
      const blob = await clientsApi.getStatementPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statement-${client?.code || client?.name || 'client'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Failed to download statement:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      partial: { variant: 'default', label: 'Partial' },
      paid: { variant: 'default', label: 'Paid' },
      overdue: { variant: 'destructive', label: 'Overdue' },
      cancelled: { variant: 'outline', label: 'Cancelled' },
      draft: { variant: 'outline', label: 'Draft' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      sent: { variant: 'default', label: 'Sent' },
      accepted: { variant: 'secondary', label: 'Accepted' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      expired: { variant: 'outline', label: 'Expired' },
      converted: { variant: 'secondary', label: 'Converted' }
    };
    const config = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentTermsLabel = (terms: string) => {
    const termsMap: Record<string, string> = {
      cash: 'Cash',
      credit_7: 'Credit 7 Days',
      credit_15: 'Credit 15 Days',
      credit_30: 'Credit 30 Days',
      credit_45: 'Credit 45 Days',
      credit_60: 'Credit 60 Days'
    };
    return termsMap[terms] || terms;
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

  if (!client) {
    return (
      <Layout>
        <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
          <p className="text-muted-foreground dark:text-slate-400">Client not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back', 'Back')}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{client.name}</h1>
              <p className="text-muted-foreground dark:text-slate-400">{client.code}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadStatement}>
              <FileText className="mr-2 h-4 w-4" />
              {t('clients.downloadStatement', 'Download Statement')}
            </Button>
            <Button onClick={() => navigate(`/clients/${id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit', 'Edit')}
            </Button>
          </div>
        </div>

        {/* Client Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">{t('clients.outstandingBalance', 'Outstanding Balance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-slate-200">{formatCurrency(client.outstandingBalance || 0)}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">{t('clients.totalInvoiced', 'Total Invoiced')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-slate-200">{formatCurrency(invoiceSummary.totalAmount)}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">{t('clients.totalPaid', 'Total Paid')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-slate-200">{formatCurrency(invoiceSummary.totalPaid)}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">{t('clients.creditLimit', 'Credit Limit')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-slate-200">{formatCurrency(client.creditLimit || 0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="dark:bg-slate-700">
            <TabsTrigger value="overview" className="dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-white">{t('clients.tabs.overview', 'Overview')}</TabsTrigger>
            <TabsTrigger value="quotations" className="dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-white">{t('clients.tabs.quotations', 'Quotations')}</TabsTrigger>
            <TabsTrigger value="invoices" className="dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-white">{t('clients.tabs.invoices', 'Invoices')}</TabsTrigger>
            <TabsTrigger value="receipts" className="dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-white">{t('clients.tabs.receipts', 'Receipts')}</TabsTrigger>
            <TabsTrigger value="creditNotes" className="dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-white">{t('clients.tabs.creditNotes', 'Credit Notes')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">{t('clients.contactInfo', 'Contact Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('clients.email', 'Email')}</span>
                    <span className="dark:text-slate-200">{client.contact?.email || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('clients.phone', 'Phone')}</span>
                    <span className="dark:text-slate-200">{client.contact?.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('clients.address', 'Address')}</span>
                    <span className="dark:text-slate-200">{client.contact?.address || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('clients.city', 'City')}</span>
                    <span className="dark:text-slate-200">{client.contact?.city || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('clients.country', 'Country')}</span>
                    <span className="dark:text-slate-200">{client.contact?.country || '-'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">{t('clients.accountInfo', 'Account Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('clients.type', 'Type')}</span>
                    <span className="capitalize dark:text-slate-200">{client.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('clients.paymentTerms', 'Payment Terms')}</span>
                    <span className="dark:text-slate-200">{getPaymentTermsLabel(client.paymentTerms)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('clients.status', 'Status')}</span>
                    <Badge variant={client.isActive ? 'default' : 'secondary'}>
                      {client.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('clients.lastPurchase', 'Last Purchase')}</span>
                    <span className="dark:text-slate-200">{formatDate(client.lastPurchaseDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">{t('clients.createdAt', 'Created')}</span>
                    <span className="dark:text-slate-200">{formatDate(client.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Quotations Tab */}
          <TabsContent value="quotations">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('clients.quotations', 'Quotations')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700">
                      <TableHead className="dark:text-white">{t('clients.quotationNumber', 'Quotation #')}</TableHead>
                      <TableHead className="dark:text-white">{t('clients.date', 'Date')}</TableHead>
                      <TableHead className="dark:text-white">{t('clients.expiryDate', 'Expiry Date')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('clients.total', 'Total')}</TableHead>
                      <TableHead className="dark:text-white">{t('clients.status', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground dark:text-slate-400">
                          {t('clients.noQuotations', 'No quotations found')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      quotations.map((quotation) => (
                        <TableRow 
                          key={quotation._id}
                          className="cursor-pointer hover:bg-muted/50 dark:hover:bg-slate-700/50"
                          onClick={() => navigate(`/client/quotations/${quotation._id}`)}
                        >
                          <TableCell className="font-medium dark:text-slate-200">{quotation.referenceNo || '-'}</TableCell>
                          <TableCell className="dark:text-slate-300">{formatDate(quotation.quotationDate)}</TableCell>
                          <TableCell className="dark:text-slate-300">{formatDate(quotation.expiryDate)}</TableCell>
                          <TableCell className="text-right dark:text-slate-200">{formatCurrency(quotation.totalAmount)}</TableCell>
                          <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('clients.invoices', 'Invoices')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700">
                      <TableHead className="dark:text-white">{t('clients.invoiceNumber', 'Invoice #')}</TableHead>
                      <TableHead className="dark:text-white">{t('clients.date', 'Date')}</TableHead>
                      <TableHead className="dark:text-white">{t('clients.dueDate', 'Due Date')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('clients.total', 'Total')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('clients.paid', 'Paid')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('clients.balance', 'Balance')}</TableHead>
                      <TableHead className="dark:text-white">{t('clients.status', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground dark:text-slate-400">
                          {t('clients.noInvoices', 'No invoices found')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((invoice) => (
                        <TableRow key={invoice._id} className="dark:hover:bg-slate-700/50">
                          <TableCell className="font-medium dark:text-slate-200">{invoice.referenceNo || '-'}</TableCell>
                          <TableCell className="dark:text-slate-300">{formatDate(invoice.invoiceDate)}</TableCell>
                          <TableCell className="dark:text-slate-300">{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell className="text-right dark:text-slate-200">{formatCurrency(invoice.grandTotal)}</TableCell>
                          <TableCell className="text-right dark:text-slate-200">{formatCurrency(invoice.amountPaid)}</TableCell>
                          <TableCell className="text-right dark:text-slate-200">{formatCurrency(invoice.balance)}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipts Tab */}
          <TabsContent value="receipts">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('clients.receipts', 'Receipts')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700">
                      <TableHead className="dark:text-white">{t('clients.receiptNumber', 'Receipt #')}</TableHead>
                      <TableHead className="dark:text-white">{t('clients.date', 'Date')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('clients.amount', 'Amount')}</TableHead>
                      <TableHead className="dark:text-white">{t('clients.paymentMethod', 'Payment Method')}</TableHead>
                      <TableHead className="dark:text-white">{t('clients.status', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground dark:text-slate-400">
                          {t('clients.noReceipts', 'No receipts found')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      receipts.map((receipt) => (
                        <TableRow key={receipt._id} className="dark:hover:bg-slate-700/50">
                          <TableCell className="font-medium dark:text-slate-200">{receipt.referenceNo || '-'}</TableCell>
                          <TableCell className="dark:text-slate-300">{formatDate(receipt.receiptDate)}</TableCell>
                          <TableCell className="text-right dark:text-slate-200">{formatCurrency(receipt.amount)}</TableCell>
                          <TableCell className="dark:text-slate-300">{receipt.paymentMethod || '-'}</TableCell>
                          <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credit Notes Tab */}
          <TabsContent value="creditNotes">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">{t('clients.creditNotes', 'Credit Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700">
                      <TableHead className="dark:text-white">{t('clients.creditNoteNumber', 'Credit Note #')}</TableHead>
                      <TableHead className="dark:text-white">{t('clients.date', 'Date')}</TableHead>
                      <TableHead className="text-right dark:text-white">{t('clients.amount', 'Amount')}</TableHead>
                      <TableHead className="dark:text-white">{t('clients.status', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditNotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground dark:text-slate-400">
                          {t('clients.noCreditNotes', 'No credit notes found')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      creditNotes.map((cn) => (
                        <TableRow key={cn._id} className="dark:hover:bg-slate-700/50">
                          <TableCell className="font-medium dark:text-slate-200">{cn.referenceNo || '-'}</TableCell>
                          <TableCell className="dark:text-slate-300">{formatDate(cn.creditNoteDate)}</TableCell>
                          <TableCell className="text-right dark:text-slate-200">{formatCurrency(cn.grandTotal)}</TableCell>
                          <TableCell>{getStatusBadge(cn.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}