import { useState, useEffect, useCallback } from 'react';
import { arReconciliationApi, arReceiptsApi, clientsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Loader2,
  FileText,
  Calendar,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Building2,
  User,
  Wallet
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/app/components/ui/pagination';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface AgingBucket {
  client: { _id: string; name: string; code: string };
  totalBalance: number;
  current: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}

interface InvoiceDetail {
  _id: string;
  invoiceNumber: string;
  referenceNo: string;
  invoiceDate: string;
  dueDate: string;
  balance: string;
  amountOutstanding: string;
  status: string;
  client: { _id: string; name: string; code?: string };
}

interface ClientSummary {
  _id: string;
  client: { _id: string; name: string; code?: string };
  totalOutstanding: number;
  invoiceCount: number;
}

interface ARTransaction {
  _id: string;
  transactionType: string;
  transactionDate: string;
  referenceNo?: string;
  description: string;
  amount: number;
  direction: 'increase' | 'decrease';
  client: { _id: string; name: string };
  invoice?: { _id: string; referenceNo?: string; invoiceNumber?: string };
  reconciliationStatus: string;
}

export default function ARDashboardPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Overview / Aging
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [agingSummary, setAgingSummary] = useState({
    current: 0,
    '1-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
    total: 0
  });
  const [agingClientFilter, setAgingClientFilter] = useState<string>('all');
  const [agingAsOfDate, setAgingAsOfDate] = useState<string>('');
  const [loadingAging, setLoadingAging] = useState(false);

  // Outstanding Invoices
  const [outstandingInvoices, setOutstandingInvoices] = useState<InvoiceDetail[]>([]);
  const [clientSummary, setClientSummary] = useState<ClientSummary[]>([]);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceTotalPages, setInvoiceTotalPages] = useState(1);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Transactions / Ledger
  const [transactions, setTransactions] = useState<ARTransaction[]>([]);
  const [transPage, setTransPage] = useState(1);
  const [transTotalPages, setTransTotalPages] = useState(1);
  const [loadingTrans, setLoadingTrans] = useState(false);

  // Client Statement Dialog
  const [selectedClient, setSelectedClient] = useState<{ _id: string; name: string; code?: string } | null>(null);
  const [clientStatement, setClientStatement] = useState<any>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  const [clients, setClients] = useState<{ _id: string; name: string; code?: string }[]>([]);

  const loadAging = useCallback(async () => {
    setLoadingAging(true);
    try {
      const params: any = {};
      if (agingClientFilter && agingClientFilter !== 'all') params.client_id = agingClientFilter;
      if (agingAsOfDate) params.as_of_date = agingAsOfDate;
      const res = await arReceiptsApi.getAgingReport(params);
      if (res) {
        setAgingData(res.data || res || []);
        const buckets = res.data || res || [];
        const summary = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
        buckets.forEach((b: AgingBucket) => {
          summary.current += b.current || 0;
          summary['1-30'] += b['1-30'] || 0;
          summary['31-60'] += b['31-60'] || 0;
          summary['61-90'] += b['61-90'] || 0;
          summary['90+'] += b['90+'] || 0;
          summary.total += b.totalBalance || 0;
        });
        setAgingSummary(summary);
      }
    } catch (e) {
      console.error('Failed to load aging report', e);
    } finally {
      setLoadingAging(false);
    }
  }, [agingClientFilter, agingAsOfDate]);

  const loadOutstandingInvoices = useCallback(async (page = 1) => {
    setLoadingInvoices(true);
    try {
      const res: any = await arReconciliationApi.getCurrentReceivables({ page, limit: 20 });
      if (res?.data) {
        setOutstandingInvoices(res.data.invoices || []);
        setClientSummary(res.data.clientSummary || []);
        setInvoiceTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (e) {
      console.error('Failed to load outstanding invoices', e);
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  const loadTransactions = useCallback(async (page = 1) => {
    setLoadingTrans(true);
    try {
      const res: any = await arReconciliationApi.getTransactions({ page, limit: 20 });
      if (res?.data) {
        setTransactions(res.data.data || []);
        setTransTotalPages(res.data.pages || 1);
      }
    } catch (e) {
      console.error('Failed to load transactions', e);
    } finally {
      setLoadingTrans(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const res: any = await clientsApi.getAll({ limit: 1000 });
      if (res?.data) {
        setClients(res.data.data || res.data || []);
      }
    } catch (e) {
      console.error('Failed to load clients', e);
    }
  }, []);

  const openClientStatement = async (client: { _id: string; name: string; code?: string }) => {
    setSelectedClient(client);
    setIsStatementOpen(true);
    setLoadingStatement(true);
    try {
      const res = await arReceiptsApi.getClientStatement(client._id);
      setClientStatement(res?.data || null);
    } catch (e) {
      console.error('Failed to load client statement', e);
      toast({ title: 'Error', description: 'Failed to load client statement', variant: 'destructive' });
    } finally {
      setLoadingStatement(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadAging();
    loadOutstandingInvoices(1);
    loadTransactions(1);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAging();
  }, [agingClientFilter, agingAsOfDate]);

  const formatMoney = (val: number) => {
    const num = typeof val === 'number' ? val : parseFloat(val as any);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(isNaN(num) ? 0 : num);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge variant="outline" className="bg-blue-50 text-blue-700">Confirmed</Badge>;
      case 'partially_paid': return <Badge variant="outline" className="bg-amber-50 text-amber-700">Partially Paid</Badge>;
      case 'fully_paid': return <Badge variant="outline" className="bg-green-50 text-green-700">Paid</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-red-50 text-red-700">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'invoice_created': return <Badge variant="outline" className="bg-blue-50 text-blue-700">Invoice</Badge>;
      case 'receipt_posted': return <Badge variant="outline" className="bg-green-50 text-green-700">Payment</Badge>;
      case 'credit_note_applied': return <Badge variant="outline" className="bg-purple-50 text-purple-700">Credit Note</Badge>;
      case 'bad_debt_writeoff': return <Badge variant="outline" className="bg-red-50 text-red-700">Write-off</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accounts Receivable</h1>
            <p className="text-muted-foreground mt-1">
              Read-only ledger showing what customers owe you. All entries flow automatically from invoices, payments, and credit notes.
            </p>
          </div>
          <Button variant="outline" onClick={() => { loadAging(); loadOutstandingInvoices(1); loadTransactions(1); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="aging">Aging Report</TabsTrigger>
              <TabsTrigger value="outstanding">Outstanding Invoices</TabsTrigger>
              <TabsTrigger value="ledger">Customer Ledger</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Outstanding</CardDescription>
                    <CardTitle className="text-2xl">{formatMoney(agingSummary.total)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Wallet className="w-4 h-4 mr-1" />
                      Across all customers
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Current (Not Due)</CardDescription>
                    <CardTitle className="text-2xl text-green-600">{formatMoney(agingSummary.current)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Within terms
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Overdue (1-30 Days)</CardDescription>
                    <CardTitle className="text-2xl text-amber-600">{formatMoney(agingSummary['1-30'])}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1" />
                      Slightly overdue
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Seriously Overdue (31+ Days)</CardDescription>
                    <CardTitle className="text-2xl text-red-600">
                      {formatMoney((agingSummary['31-60'] || 0) + (agingSummary['61-90'] || 0) + (agingSummary['90+'] || 0))}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Requires attention
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top customers by outstanding balance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Top Customers by Outstanding Balance
                  </CardTitle>
                  <CardDescription>Customers with the highest AR balances</CardDescription>
                </CardHeader>
                <CardContent>
                  {clientSummary.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No outstanding receivables
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Outstanding Balance</TableHead>
                          <TableHead>Invoices</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientSummary.map((cs) => (
                          <TableRow key={cs._id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                {cs.client?.name || 'Unknown'}
                                {cs.client?.code && <span className="text-muted-foreground text-xs">({cs.client.code})</span>}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{formatMoney(cs.totalOutstanding)}</TableCell>
                            <TableCell>{cs.invoiceCount}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openClientStatement(cs.client)}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Statement
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aging Report Tab */}
            <TabsContent value="aging" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value={agingClientFilter} onValueChange={setAgingClientFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Customers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={agingAsOfDate}
                    onChange={(e) => setAgingAsOfDate(e.target.value)}
                    className="w-[160px]"
                    placeholder="As of date"
                  />
                </div>
                {loadingAging && <Loader2 className="w-5 h-5 animate-spin" />}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Aging Report</CardTitle>
                  <CardDescription>Outstanding balances grouped by invoice age</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">1-30 Days</TableHead>
                        <TableHead className="text-right">31-60 Days</TableHead>
                        <TableHead className="text-right">61-90 Days</TableHead>
                        <TableHead className="text-right">90+ Days</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agingData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No outstanding receivables
                          </TableCell>
                        </TableRow>
                      ) : (
                        agingData.map((bucket) => (
                          <TableRow key={bucket.client?._id || Math.random()}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                {bucket.client?.name || 'Unknown'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{formatMoney(bucket.current)}</TableCell>
                            <TableCell className="text-right">{formatMoney(bucket['1-30'])}</TableCell>
                            <TableCell className="text-right">{formatMoney(bucket['31-60'])}</TableCell>
                            <TableCell className="text-right">{formatMoney(bucket['61-90'])}</TableCell>
                            <TableCell className="text-right text-red-600">{formatMoney(bucket['90+'])}</TableCell>
                            <TableCell className="text-right font-semibold">{formatMoney(bucket.totalBalance)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openClientStatement(bucket.client)}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Statement
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Outstanding Invoices Tab */}
            <TabsContent value="outstanding" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Outstanding Invoices</CardTitle>
                  <CardDescription>Unpaid and partially paid invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingInvoices ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : outstandingInvoices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No outstanding invoices
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Invoice Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Outstanding</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outstandingInvoices.map((inv) => (
                            <TableRow key={inv._id}>
                              <TableCell className="font-medium">{inv.invoiceNumber || inv.referenceNo}</TableCell>
                              <TableCell>{inv.client?.name || 'Unknown'}</TableCell>
                              <TableCell>{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '-'}</TableCell>
                              <TableCell>
                                {inv.dueDate ? (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(inv.dueDate).toLocaleDateString()}
                                    {new Date(inv.dueDate) < new Date() && (
                                      <Badge variant="destructive" className="text-xs ml-1">Overdue</Badge>
                                    )}
                                  </div>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatMoney(parseFloat(inv.balance?.toString() || '0') + parseFloat(inv.amountOutstanding?.toString() || '0'))}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatMoney(parseFloat(inv.amountOutstanding?.toString() || '0'))}
                              </TableCell>
                              <TableCell>{getStatusBadge(inv.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="mt-4 flex justify-center">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => {
                                  if (invoicePage > 1) {
                                    setInvoicePage(invoicePage - 1);
                                    loadOutstandingInvoices(invoicePage - 1);
                                  }
                                }}
                                className={invoicePage <= 1 ? 'pointer-events-none opacity-50' : ''}
                              />
                            </PaginationItem>
                            {Array.from({ length: invoiceTotalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  isActive={page === invoicePage}
                                  onClick={() => {
                                    setInvoicePage(page);
                                    loadOutstandingInvoices(page);
                                  }}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => {
                                  if (invoicePage < invoiceTotalPages) {
                                    setInvoicePage(invoicePage + 1);
                                    loadOutstandingInvoices(invoicePage + 1);
                                  }
                                }}
                                className={invoicePage >= invoiceTotalPages ? 'pointer-events-none opacity-50' : ''}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Customer Ledger Tab */}
            <TabsContent value="ledger" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Ledger</CardTitle>
                  <CardDescription>Transaction history for all customers</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingTrans ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Direction</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((tx) => (
                            <TableRow key={tx._id}>
                              <TableCell>{tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString() : '-'}</TableCell>
                              <TableCell className="font-medium">{tx.client?.name || 'Unknown'}</TableCell>
                              <TableCell>{getTransactionBadge(tx.transactionType)}</TableCell>
                              <TableCell>{tx.referenceNo || tx.invoice?.referenceNo || tx.invoice?.invoiceNumber || '-'}</TableCell>
                              <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                              <TableCell className="text-right">{formatMoney(tx.amount)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={tx.direction === 'increase' ? 'default' : 'secondary'}>
                                  {tx.direction === 'increase' ? 'Increases AR' : 'Reduces AR'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="mt-4 flex justify-center">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => {
                                  if (transPage > 1) {
                                    setTransPage(transPage - 1);
                                    loadTransactions(transPage - 1);
                                  }
                                }}
                                className={transPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                              />
                            </PaginationItem>
                            {Array.from({ length: transTotalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  isActive={page === transPage}
                                  onClick={() => {
                                    setTransPage(page);
                                    loadTransactions(page);
                                  }}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => {
                                  if (transPage < transTotalPages) {
                                    setTransPage(transPage + 1);
                                    loadTransactions(transPage + 1);
                                  }
                                }}
                                className={transPage >= transTotalPages ? 'pointer-events-none opacity-50' : ''}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Client Statement Dialog */}
        <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Statement: {selectedClient?.name}
              </DialogTitle>
            </DialogHeader>
            {loadingStatement ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : clientStatement ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Invoiced</CardDescription>
                      <CardTitle className="text-lg">{formatMoney(clientStatement.summary?.totalInvoiced || 0)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Paid</CardDescription>
                      <CardTitle className="text-lg text-green-600">{formatMoney(clientStatement.summary?.totalPaid || 0)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Balance</CardDescription>
                      <CardTitle className="text-lg text-red-600">{formatMoney(clientStatement.summary?.balance || 0)}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(clientStatement.transactions || []).map((tx: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{tx.date ? new Date(tx.date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{tx.reference || '-'}</TableCell>
                        <TableCell>{tx.description || '-'}</TableCell>
                        <TableCell className="text-right text-blue-600">{tx.debit ? formatMoney(tx.debit) : '-'}</TableCell>
                        <TableCell className="text-right text-green-600">{tx.credit ? formatMoney(tx.credit) : '-'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMoney(tx.runningBalance || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No statement data available</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
