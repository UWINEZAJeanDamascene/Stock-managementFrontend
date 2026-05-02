import { useState, useEffect, useCallback } from 'react';
import { apReconciliationApi, apPaymentsApi, suppliersApi } from '@/lib/api';
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
  supplier: { _id: string; name: string; code: string };
  totalBalance: number;
  current: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}

interface APTransaction {
  _id: string;
  transactionType: string;
  transactionDate: string;
  referenceNo: string;
  description: string;
  amount: number;
  direction: 'increase' | 'decrease';
  supplier: { _id: string; name: string };
  reconciliationStatus: string;
}

export default function APDashboardPage() {
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
  const [agingSupplierFilter, setAgingSupplierFilter] = useState<string>('all');
  const [agingAsOfDate, setAgingAsOfDate] = useState<string>('');
  const [loadingAging, setLoadingAging] = useState(false);

  // Outstanding payables (GRNs)
  const [outstandingPayables, setOutstandingPayables] = useState<any[]>([]);
  const [payablePage, setPayablePage] = useState(1);
  const [payableTotalPages, setPayableTotalPages] = useState(1);
  const [loadingPayables, setLoadingPayables] = useState(false);

  // Transactions / Ledger
  const [transactions, setTransactions] = useState<APTransaction[]>([]);
  const [transPage, setTransPage] = useState(1);
  const [transTotalPages, setTransTotalPages] = useState(1);
  const [loadingTrans, setLoadingTrans] = useState(false);

  // Supplier Statement Dialog
  const [selectedSupplier, setSelectedSupplier] = useState<{ _id: string; name: string; code?: string } | null>(null);
  const [supplierStatement, setSupplierStatement] = useState<any>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  const [suppliers, setSuppliers] = useState<{ _id: string; name: string; code?: string }[]>([]);

  const loadAging = useCallback(async () => {
    setLoadingAging(true);
    try {
      const params: any = {};
      if (agingSupplierFilter && agingSupplierFilter !== 'all') params.supplier_id = agingSupplierFilter;
      if (agingAsOfDate) params.as_of_date = agingAsOfDate;
      const res: any = await apPaymentsApi.getAgingReport(params);
      if (res) {
        const buckets = res.data || res || [];
        setAgingData(buckets);
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
      console.error('Failed to load AP aging report', e);
    } finally {
      setLoadingAging(false);
    }
  }, [agingSupplierFilter, agingAsOfDate]);

  const loadOutstandingPayables = useCallback(async (page = 1) => {
    setLoadingPayables(true);
    try {
      const res: any = await apReconciliationApi.getCurrentPayables({ page, limit: 20 });
      if (res?.data) {
        setOutstandingPayables(res.data.grns || []);
        setPayableTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (e) {
      console.error('Failed to load outstanding payables', e);
    } finally {
      setLoadingPayables(false);
    }
  }, []);

  const loadTransactions = useCallback(async (page = 1) => {
    setLoadingTrans(true);
    try {
      const res: any = await apReconciliationApi.getTransactions({ page, limit: 20 });
      if (res?.data) {
        setTransactions(res.data.data || []);
        setTransTotalPages(res.data.pages || 1);
      }
    } catch (e) {
      console.error('Failed to load AP transactions', e);
    } finally {
      setLoadingTrans(false);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const res: any = await suppliersApi.getAll({ limit: 1000 });
      if (res?.data) {
        setSuppliers(res.data.data || res.data || []);
      }
    } catch (e) {
      console.error('Failed to load suppliers', e);
    }
  }, []);

  const openSupplierStatement = async (supplier: { _id: string; name: string; code?: string }) => {
    setSelectedSupplier(supplier);
    setIsStatementOpen(true);
    setLoadingStatement(true);
    try {
      const res: any = await apPaymentsApi.getSupplierStatement(supplier._id);
      setSupplierStatement(res?.data || null);
    } catch (e) {
      console.error('Failed to load supplier statement', e);
      toast({ title: 'Error', description: 'Failed to load supplier statement', variant: 'destructive' });
    } finally {
      setLoadingStatement(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadAging();
    loadOutstandingPayables(1);
    loadTransactions(1);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAging();
  }, [agingSupplierFilter, agingAsOfDate]);

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
      case 'grn_received': return <Badge variant="outline" className="bg-blue-50 text-blue-700">GRN</Badge>;
      case 'payment_posted': return <Badge variant="outline" className="bg-green-50 text-green-700">Payment</Badge>;
      case 'payment_allocation': return <Badge variant="outline" className="bg-purple-50 text-purple-700">Allocation</Badge>;
      case 'write_off': return <Badge variant="outline" className="bg-red-50 text-red-700">Write-off</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accounts Payable</h1>
            <p className="text-muted-foreground mt-1">
              Read-only ledger showing what you owe suppliers. All entries flow automatically from purchases, GRNs, and payments.
            </p>
          </div>
          <Button variant="outline" onClick={() => { loadAging(); loadOutstandingPayables(1); loadTransactions(1); }}>
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
              <TabsTrigger value="outstanding">Outstanding Payables</TabsTrigger>
              <TabsTrigger value="ledger">Supplier Ledger</TabsTrigger>
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
                      Across all suppliers
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
            </TabsContent>

            {/* Aging Report Tab */}
            <TabsContent value="aging" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value={agingSupplierFilter} onValueChange={setAgingSupplierFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
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
                  <CardTitle>AP Aging Report</CardTitle>
                  <CardDescription>Outstanding balances grouped by invoice age</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
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
                            No outstanding payables
                          </TableCell>
                        </TableRow>
                      ) : (
                        agingData.map((bucket) => (
                          <TableRow key={bucket.supplier?._id || Math.random()}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                {bucket.supplier?.name || 'Unknown'}
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
                                onClick={() => openSupplierStatement(bucket.supplier)}
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

            {/* Outstanding Payables Tab */}
            <TabsContent value="outstanding" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Outstanding Payables</CardTitle>
                  <CardDescription>Unpaid and partially paid GRNs / purchase invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingPayables ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : outstandingPayables.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No outstanding payables
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Reference</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outstandingPayables.map((grn: any) => (
                            <TableRow key={grn._id}>
                              <TableCell className="font-medium">{grn.reference || grn.referenceNo || grn.grnNumber}</TableCell>
                              <TableCell>{grn.supplier?.name || 'Unknown'}</TableCell>
                              <TableCell>{grn.receivedDate ? new Date(grn.receivedDate).toLocaleDateString() : '-'}</TableCell>
                              <TableCell className="text-right">{formatMoney(grn.totalAmount)}</TableCell>
                              <TableCell className="text-right">{formatMoney(grn.amountPaid)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatMoney(grn.balance)}</TableCell>
                              <TableCell>{getStatusBadge(grn.paymentStatus || grn.status)}</TableCell>
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
                                  if (payablePage > 1) {
                                    setPayablePage(payablePage - 1);
                                    loadOutstandingPayables(payablePage - 1);
                                  }
                                }}
                                className={payablePage <= 1 ? 'pointer-events-none opacity-50' : ''}
                              />
                            </PaginationItem>
                            {Array.from({ length: payableTotalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  isActive={page === payablePage}
                                  onClick={() => {
                                    setPayablePage(page);
                                    loadOutstandingPayables(page);
                                  }}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => {
                                  if (payablePage < payableTotalPages) {
                                    setPayablePage(payablePage + 1);
                                    loadOutstandingPayables(payablePage + 1);
                                  }
                                }}
                                className={payablePage >= payableTotalPages ? 'pointer-events-none opacity-50' : ''}
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

            {/* Supplier Ledger Tab */}
            <TabsContent value="ledger" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Supplier Ledger</CardTitle>
                  <CardDescription>Transaction history for all suppliers</CardDescription>
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
                            <TableHead>Supplier</TableHead>
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
                              <TableCell className="font-medium">{tx.supplier?.name || 'Unknown'}</TableCell>
                              <TableCell>{getTransactionBadge(tx.transactionType)}</TableCell>
                              <TableCell>{tx.referenceNo || '-'}</TableCell>
                              <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                              <TableCell className="text-right">{formatMoney(tx.amount)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={tx.direction === 'increase' ? 'default' : 'secondary'}>
                                  {tx.direction === 'increase' ? 'Increases AP' : 'Reduces AP'}
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

        {/* Supplier Statement Dialog */}
        <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Supplier Statement: {selectedSupplier?.name}
              </DialogTitle>
            </DialogHeader>
            {loadingStatement ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : supplierStatement ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total GRNs</CardDescription>
                      <CardTitle className="text-lg">{formatMoney(supplierStatement.summary?.totalGRNs || 0)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Paid</CardDescription>
                      <CardTitle className="text-lg text-green-600">{formatMoney(supplierStatement.summary?.totalPaid || 0)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Balance</CardDescription>
                      <CardTitle className="text-lg text-red-600">{formatMoney(supplierStatement.summary?.totalOutstanding || 0)}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(supplierStatement.grns || []).map((grn: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{grn.date ? new Date(grn.date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{grn.reference || '-'}</TableCell>
                        <TableCell className="text-right">{formatMoney(grn.total)}</TableCell>
                        <TableCell className="text-right">{formatMoney(grn.paid)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMoney(grn.balance)}</TableCell>
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
