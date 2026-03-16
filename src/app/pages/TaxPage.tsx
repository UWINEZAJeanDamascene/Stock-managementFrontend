import React, { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { taxApi, TaxRecord, TaxCalendarEntry } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Receipt, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Building
} from 'lucide-react';

export default function TaxPage() {
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [calendar, setCalendar] = useState<TaxCalendarEntry[]>([]);
  const [filings, setFilings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isFilingDialogOpen, setIsFilingDialogOpen] = useState(false);
  const [isVATReturnOpen, setIsVATReturnOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState<TaxRecord | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [vatReturnData, setVatReturnData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    taxType: 'vat' as 'vat' | 'corporate_income' | 'paye' | 'withholding' | 'trading_license',
    vatRate: 18,
    corporateIncomeRate: 30,
    tradingLicenseFee: 0,
    notes: ''
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    method: 'bank_transfer',
    notes: ''
  });

  const [filingData, setFilingData] = useState({
    filingDate: new Date().toISOString().split('T')[0],
    filingPeriod: { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    amountDeclared: 0,
    filingReference: '',
    status: 'filed',
    notes: ''
  });

  const [vatReturnParams, setVatReturnParams] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [taxRes, summaryRes, calendarRes, filingsRes] = await Promise.all([
        taxApi.getAll(),
        taxApi.getSummary({ year: parseInt(filterYear) }),
        taxApi.getCalendar({ year: parseInt(filterYear) }),
        taxApi.getFilingHistory({ year: parseInt(filterYear) })
      ]);
      
      setTaxRecords(taxRes.data);
      setSummary(summaryRes.data);
      setCalendar(calendarRes.data);
      setFilings(filingsRes.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load tax data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterYear]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF' }).format(value || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await taxApi.create(formData);
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create tax record');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTax) return;
    try {
      await taxApi.addPayment(selectedTax._id, paymentData);
      setIsPaymentDialogOpen(false);
      setSelectedTax(null);
      resetPaymentForm();
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to add payment');
    }
  };

  const handleAddFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTax) return;
    try {
      await taxApi.addFiling(selectedTax._id, filingData);
      setIsFilingDialogOpen(false);
      setSelectedTax(null);
      resetFilingForm();
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to add filing');
    }
  };

  const handlePrepareVATReturn = async () => {
    try {
      const res = await taxApi.prepareVATReturn(vatReturnParams);
      setVatReturnData(res.data);
      setIsVATReturnOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to prepare VAT return');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax record?')) return;
    try {
      await taxApi.delete(id);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete record');
    }
  };

  const openPaymentDialog = (tax: TaxRecord) => {
    setSelectedTax(tax);
    setIsPaymentDialogOpen(true);
  };

  const openFilingDialog = (tax: TaxRecord) => {
    setSelectedTax(tax);
    setIsFilingDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      taxType: 'vat',
      vatRate: 18,
      corporateIncomeRate: 30,
      tradingLicenseFee: 0,
      notes: ''
    });
  };

  const resetPaymentForm = () => {
    setPaymentData({
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      reference: '',
      method: 'bank_transfer',
      notes: ''
    });
  };

  const resetFilingForm = () => {
    setFilingData({
      filingDate: new Date().toISOString().split('T')[0],
      filingPeriod: { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
      amountDeclared: 0,
      filingReference: '',
      status: 'filed',
      notes: ''
    });
  };

  const getTaxTypeName = (type: string) => {
    const names: Record<string, string> = {
      vat: 'VAT',
      corporate_income: 'Corporate Income Tax',
      paye: 'PAYE',
      withholding: 'Withholding Tax',
      trading_license: 'Trading License'
    };
    return names[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      filed: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800',
      upcoming: 'bg-yellow-100 text-yellow-800',
      due_soon: 'bg-orange-100 text-orange-800',
      pending: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Tax Management
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => taxApi.generateCalendar(parseInt(filterYear)).then(fetchData)}>
              <Calendar className="h-4 w-4 mr-2" />
              Generate Calendar
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tax Type
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
            <button onClick={() => setError(null)} className="absolute top-0 right-0 px-4 py-3">×</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="calendar">Tax Calendar</TabsTrigger>
            <TabsTrigger value="filings">Filing History</TabsTrigger>
            <TabsTrigger value="vat">VAT Returns</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-4">
              {summary && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">VAT (Output - Input)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${summary.vat?.net > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(summary.vat?.net || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {summary.vat?.isPayable ? 'Payable to RRA' : 'Refund Due'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">PAYE Collected</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.paye?.collected || 0)}</div>
                        <div className="text-xs text-muted-foreground mt-1">Employee income tax</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Corporate Tax Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{summary.corporateIncome?.rate || 30}%</div>
                        <div className="text-xs text-muted-foreground mt-1">Quarterly filing</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Trading License</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.tradingLicense?.fee || 0)}</div>
                        <Badge className={`mt-1 ${getStatusColor(summary.tradingLicense?.status || '')}`}>
                          {summary.tradingLicense?.status || 'N/A'}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Upcoming Deadlines */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Upcoming Deadlines
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {summary.upcomingDeadlines?.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tax Type</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summary.upcomingDeadlines.map((deadline: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{getTaxTypeName(deadline.taxType)}</TableCell>
                                <TableCell>{new Date(deadline.dueDate).toLocaleDateString()}</TableCell>
                                <TableCell>{deadline.period?.month}/{deadline.period?.year}</TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(deadline.status)}>{deadline.status}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No upcoming deadlines</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Overdue */}
                  {summary.overdue?.length > 0 && (
                    <Card className="border-red-300">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-5 w-5" />
                          Overdue Taxes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tax Type</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Period</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summary.overdue.map((item: any, idx: number) => (
                              <TableRow key={idx} className="text-red-600">
                                <TableCell className="font-medium">{getTaxTypeName(item.taxType)}</TableCell>
                                <TableCell>{new Date(item.dueDate).toLocaleDateString()}</TableCell>
                                <TableCell>{item.period?.month}/{item.period?.year}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Tax Records */}
              <Card>
                <CardHeader>
                  <CardTitle>Tax Configurations</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : taxRecords.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No tax records found. Click "Add Tax Type" to create one.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tax Type</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payments</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {taxRecords.map((record) => (
                          <TableRow key={record._id}>
                            <TableCell className="font-medium">{getTaxTypeName(record.taxType)}</TableCell>
                            <TableCell>
                              {record.taxType === 'vat' && `${record.vatRate}%`}
                              {record.taxType === 'corporate_income' && `${record.corporateIncomeRate}%`}
                              {record.taxType === 'trading_license' && formatCurrency(record.tradingLicenseFee)}
                              {record.taxType === 'paye' && 'Per employee'}
                              {record.taxType === 'withholding' && 'Per transaction'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(record.status)}>{record.status}</Badge>
                            </TableCell>
                            <TableCell>{record.payments?.length || 0} payments</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openPaymentDialog(record)} title="Add Payment">
                                  <DollarSign className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openFilingDialog(record)} title="Add Filing">
                                  <FileText className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(record._id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Tax Calendar - {filterYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calendar.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No calendar entries. Click "Generate Calendar" to create.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tax Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calendar.map((entry, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{getTaxTypeName(entry.taxType)}</TableCell>
                          <TableCell>{entry.title}</TableCell>
                          <TableCell>{new Date(entry.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell>{entry.period?.month}/{entry.period?.year}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(entry.status)}>{entry.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Filing History Tab */}
          <TabsContent value="filings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  RRA Filing History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No filing records found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tax Type</TableHead>
                        <TableHead>Filing Date</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filings.map((filing, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{getTaxTypeName(filing.taxType)}</TableCell>
                          <TableCell>{new Date(filing.filingDate).toLocaleDateString()}</TableCell>
                          <TableCell>{filing.filingPeriod?.month}/{filing.filingPeriod?.year}</TableCell>
                          <TableCell>{formatCurrency(filing.amountDeclared)}</TableCell>
                          <TableCell>{filing.filingReference || '-'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(filing.status)}>{filing.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* VAT Returns Tab */}
          <TabsContent value="vat">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  VAT Return Preparation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select 
                      value={String(vatReturnParams.month)} 
                      onValueChange={(v) => setVatReturnParams({ ...vatReturnParams, month: parseInt(v) })}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <SelectItem key={m} value={String(m)}>
                            {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select 
                      value={String(vatReturnParams.year)} 
                      onValueChange={(v) => setVatReturnParams({ ...vatReturnParams, year: parseInt(v) })}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handlePrepareVATReturn}>
                      Prepare Return
                    </Button>
                  </div>
                </div>

                {vatReturnData && (
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                    <h3 className="font-medium mb-4">VAT Return - {new Date(vatReturnData.period.year, vatReturnData.period.month - 1).toLocaleString('default', { month: 'long' })} {vatReturnData.period.year}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>Output VAT (Sales):</div>
                      <div className="font-medium">{formatCurrency(vatReturnData.vatOutput)}</div>
                      
                      <div>Input VAT (Purchases):</div>
                      <div className="font-medium">{formatCurrency(vatReturnData.vatInput)}</div>
                      
                      <div className="font-bold border-t pt-2">Net VAT:</div>
                      <div className={`font-bold border-t pt-2 ${vatReturnData.netVAT > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(vatReturnData.netVAT)}
                      </div>
                      
                      {vatReturnData.isPayable && (
                        <>
                          <div>Payable to RRA:</div>
                          <div className="font-bold text-red-600">{formatCurrency(vatReturnData.netVAT)}</div>
                        </>
                      )}
                      
                      {!vatReturnData.isPayable && (
                        <>
                          <div>Refund from RRA:</div>
                          <div className="font-bold text-green-600">{formatCurrency(vatReturnData.refund)}</div>
                        </>
                      )}
                      
                      <div>Due Date:</div>
                      <div>{new Date(vatReturnData.dueDate).toLocaleDateString()}</div>
                      
                      <div>Filing Status:</div>
                      <Badge className={getStatusColor(vatReturnData.filingStatus)}>{vatReturnData.filingStatus}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Tax Type Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tax Type</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tax Type</Label>
                  <Select 
                    value={formData.taxType} 
                    onValueChange={(v: any) => setFormData({ ...formData, taxType: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vat">VAT (18%)</SelectItem>
                      <SelectItem value="corporate_income">Corporate Income Tax (30%)</SelectItem>
                      <SelectItem value="paye">PAYE</SelectItem>
                      <SelectItem value="withholding">Withholding Tax</SelectItem>
                      <SelectItem value="trading_license">Trading License</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.taxType === 'vat' && (
                  <div className="space-y-2">
                    <Label>VAT Rate (%)</Label>
                    <Input
                      type="number"
                      value={formData.vatRate}
                      onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) })}
                    />
                  </div>
                )}
                
                {formData.taxType === 'corporate_income' && (
                  <div className="space-y-2">
                    <Label>Corporate Tax Rate (%)</Label>
                    <Input
                      type="number"
                      value={formData.corporateIncomeRate}
                      onChange={(e) => setFormData({ ...formData, corporateIncomeRate: parseFloat(e.target.value) })}
                    />
                  </div>
                )}
                
                {formData.taxType === 'trading_license' && (
                  <div className="space-y-2">
                    <Label>License Fee</Label>
                    <Input
                      type="number"
                      value={formData.tradingLicenseFee}
                      onChange={(e) => setFormData({ ...formData, tradingLicenseFee: parseFloat(e.target.value) })}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Tax Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPayment}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reference</Label>
                  <Input
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select 
                    value={paymentData.method} 
                    onValueChange={(v) => setPaymentData({ ...paymentData, method: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Record Payment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Filing Dialog */}
        <Dialog open={isFilingDialogOpen} onOpenChange={setIsFilingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Tax Filing</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddFiling}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Filing Date</Label>
                  <Input
                    type="date"
                    value={filingData.filingDate}
                    onChange={(e) => setFilingData({ ...filingData, filingDate: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Period Month</Label>
                    <Select 
                      value={String(filingData.filingPeriod.month)} 
                      onValueChange={(v) => setFilingData({ ...filingData, filingPeriod: { ...filingData.filingPeriod, month: parseInt(v) } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <SelectItem key={m} value={String(m)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Period Year</Label>
                    <Select 
                      value={String(filingData.filingPeriod.year)} 
                      onValueChange={(v) => setFilingData({ ...filingData, filingPeriod: { ...filingData.filingPeriod, year: parseInt(v) } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {years.map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount Declared</Label>
                  <Input
                    type="number"
                    value={filingData.amountDeclared}
                    onChange={(e) => setFilingData({ ...filingData, amountDeclared: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Filing Reference</Label>
                  <Input
                    value={filingData.filingReference}
                    onChange={(e) => setFilingData({ ...filingData, filingReference: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={filingData.status} 
                    onValueChange={(v) => setFilingData({ ...filingData, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="filed">Filed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFilingDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Record Filing</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
