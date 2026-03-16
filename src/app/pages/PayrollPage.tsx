import React, { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { payrollApi, PayrollRecord } from '@/lib/api';
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
import { 
  DollarSign, 
  Plus, 
  Pencil, 
  Trash2, 
  FileText,
  Calculator,
  Users,
  TrendingUp,
  Download,
  Eye,
  CheckCircle,
  Clock,
  Receipt
} from 'lucide-react';

export default function PayrollPage() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [calculatedValues, setCalculatedValues] = useState<any>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [payingRecordId, setPayingRecordId] = useState<string>('');
  
  // PAYE Payment Dialog State
  const [isPAYEPaymentDialogOpen, setIsPAYEPaymentDialogOpen] = useState(false);
  const [payePaymentData, setPayePaymentData] = useState({
    amount: 0,
    paymentMethod: 'bank_transfer',
    reference: '',
    notes: ''
  });
  const [payingPAYE, setPayingPAYE] = useState(false);
  
  // RSSB Payment Dialog State
  const [isRSSBPaymentDialogOpen, setIsRSSBPaymentDialogOpen] = useState(false);
  const [rssbPaymentData, setRssbPaymentData] = useState({
    amount: 0,
    paymentMethod: 'bank_transfer',
    reference: '',
    notes: ''
  });
  const [payingRSSB, setPayingRSSB] = useState(false);

  const [formData, setFormData] = useState({
    employee: {
      employeeId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      nationalId: '',
      bankName: '',
      bankAccount: ''
    },
    salary: {
      basicSalary: 0,
      transportAllowance: 0,
      housingAllowance: 0,
      otherAllowances: 0
    },
    period: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    },
    notes: ''
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterYear !== 'all') params.year = parseInt(filterYear);
      if (filterMonth !== 'all') params.month = parseInt(filterMonth);
      
      const [payrollRes, summaryRes] = await Promise.all([
        payrollApi.getAll(params),
        payrollApi.getSummary({ year: parseInt(filterYear) })
      ]);
      
      setPayrollRecords(payrollRes.data);
      setSummary(summaryRes.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterMonth, filterYear]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF' }).format(value || 0);

  const handleCalculate = async () => {
    try {
      const res = await payrollApi.calculate({ salary: formData.salary });
      setCalculatedValues(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to calculate');
    }
  };

  useEffect(() => {
    if (formData.salary.basicSalary > 0) {
      handleCalculate();
    }
  }, [formData.salary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await payrollApi.update(editingRecord._id, formData);
      } else {
        await payrollApi.create(formData);
      }
      setIsDialogOpen(false);
      setEditingRecord(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save payroll record');
    }
  };

  const handleEdit = (record: PayrollRecord) => {
    setEditingRecord(record);
    setFormData({
      employee: {
        employeeId: record.employee.employeeId,
        firstName: record.employee.firstName,
        lastName: record.employee.lastName,
        email: record.employee.email || '',
        phone: record.employee.phone || '',
        department: record.employee.department || '',
        position: record.employee.position || '',
        nationalId: record.employee.nationalId || '',
        bankName: record.employee.bankName || '',
        bankAccount: record.employee.bankAccount || ''
      },
      salary: {
        basicSalary: record.salary.basicSalary,
        transportAllowance: record.salary.transportAllowance,
        housingAllowance: record.salary.housingAllowance,
        otherAllowances: record.salary.otherAllowances
      },
      period: {
        month: record.period.month,
        year: record.period.year
      },
      notes: record.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;
    try {
      await payrollApi.delete(id);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete record');
    }
  };

  const handleProcessPayment = async () => {
    try {
      await payrollApi.processPayment(payingRecordId, { paymentMethod });
      setIsPaymentDialogOpen(false);
      setPayingRecordId('');
      setPaymentMethod('bank_transfer');
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to process payment');
    }
  };

  const handlePayPAYE = async () => {
    try {
      setPayingPAYE(true);
      await payrollApi.payPAYE({
        amount: payePaymentData.amount,
        paymentMethod: payePaymentData.paymentMethod,
        reference: payePaymentData.reference,
        notes: payePaymentData.notes
      });
      setIsPAYEPaymentDialogOpen(false);
      setPayePaymentData({
        amount: 0,
        paymentMethod: 'bank_transfer',
        reference: '',
        notes: ''
      });
      alert('PAYE payment recorded successfully! Journal entry: DR PAYE Payable, CR ' + (payePaymentData.paymentMethod === 'bank_transfer' ? 'Cash at Bank' : payePaymentData.paymentMethod === 'mobile_money' ? 'MTN MoMo' : 'Cash in Hand'));
    } catch (err: any) {
      setError(err?.message || 'Failed to process PAYE payment');
    } finally {
      setPayingPAYE(false);
    }
  };

  const openPAYEPaymentDialog = () => {
    // Pre-fill with total PAYE from summary
    const totalPAYE = summary?.totals?.totalPAYE || 0;
    setPayePaymentData({
      amount: totalPAYE,
      paymentMethod: 'bank_transfer',
      reference: '',
      notes: `PAYE payment for ${filterYear}`
    });
    setIsPAYEPaymentDialogOpen(true);
  };

  const handlePayRSSB = async () => {
    try {
      setPayingRSSB(true);
      await payrollApi.payRSSB({
        amount: rssbPaymentData.amount,
        paymentMethod: rssbPaymentData.paymentMethod,
        reference: rssbPaymentData.reference,
        notes: rssbPaymentData.notes
      });
      setIsRSSBPaymentDialogOpen(false);
      setRssbPaymentData({
        amount: 0,
        paymentMethod: 'bank_transfer',
        reference: '',
        notes: ''
      });
      alert('RSSB payment recorded successfully! Journal entry: DR RSSB Payable, CR ' + (rssbPaymentData.paymentMethod === 'bank_transfer' ? 'Cash at Bank' : rssbPaymentData.paymentMethod === 'mobile_money' ? 'MTN MoMo' : 'Cash in Hand'));
    } catch (err: any) {
      setError(err?.message || 'Failed to process RSSB payment');
    } finally {
      setPayingRSSB(false);
    }
  };

  const openRSSBPaymentDialog = () => {
    // Pre-fill with total RSSB from summary
    const totalRSSB = summary?.totals?.totalRSSB || 0;
    setRssbPaymentData({
      amount: totalRSSB,
      paymentMethod: 'bank_transfer',
      reference: '',
      notes: `RSSB payment for ${filterYear}`
    });
    setIsRSSBPaymentDialogOpen(true);
  };

  const openPaymentDialog = (id: string) => {
    setPayingRecordId(id);
    setIsPaymentDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      employee: {
        employeeId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        nationalId: '',
        bankName: '',
        bankAccount: ''
      },
      salary: {
        basicSalary: 0,
        transportAllowance: 0,
        housingAllowance: 0,
        otherAllowances: 0
      },
      period: {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      },
      notes: ''
    });
    setCalculatedValues(null);
  };

  const openNewDialog = () => {
    setEditingRecord(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openPayslip = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setIsPayslipOpen(true);
  };

  const filteredRecords = payrollRecords.filter(record => {
    const fullName = `${record.employee.firstName} ${record.employee.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) ||
      record.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Payroll Management
          </h1>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
            <button onClick={() => setError(null)} className="absolute top-0 right-0 px-4 py-3">×</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <SelectItem key={m} value={String(m)}>{getMonthName(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[120px]">
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
            <TabsTrigger value="list">Payroll List</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          {/* Payroll List Tab */}
          <TabsContent value="list">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payroll records found. Click "Add Employee" to create one.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Gross Salary</TableHead>
                        <TableHead>PAYE</TableHead>
                        <TableHead>RSSB</TableHead>
                        <TableHead>Net Pay</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell className="font-medium">
                            {record.employee.firstName} {record.employee.lastName}
                            <div className="text-xs text-muted-foreground">{record.employee.employeeId}</div>
                          </TableCell>
                          <TableCell>{record.employee.department || '-'}</TableCell>
                          <TableCell>
                            {getMonthName(record.period.month)} {record.period.year}
                          </TableCell>
                          <TableCell>{formatCurrency(record.salary.grossSalary)}</TableCell>
                          <TableCell className="text-red-600">{formatCurrency(record.deductions.paye)}</TableCell>
                          <TableCell className="text-orange-600">{formatCurrency(record.deductions.rssbEmployee)}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(record.netPay)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              record.payment.status === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {record.payment.status === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openPayslip(record)} title="View Payslip">
                                <FileText className="h-4 w-4 text-blue-500" />
                              </Button>
                              {record.payment.status !== 'paid' && (
                                <Button variant="ghost" size="icon" onClick={() => openPaymentDialog(record._id)} title="Process Payment">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(record)}>
                                <Pencil className="h-4 w-4" />
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
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <div className="space-y-4">
              {summary && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Gross Salary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.totals?.totalGrossSalary || 0)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Net Pay</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totals?.totalNetPay || 0)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total PAYE</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totals?.totalPAYE || 0)}</div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 w-full border-red-600 text-red-600 hover:bg-red-50"
                          onClick={openPAYEPaymentDialog}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          Pay PAYE to RRA
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total RSSB</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totals?.totalRSSB || 0)}</div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 w-full border-orange-600 text-orange-600 hover:bg-orange-50"
                          onClick={openRSSBPaymentDialog}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          Pay RSSB
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Employees</TableHead>
                            <TableHead>Gross Salary</TableHead>
                            <TableHead>Net Pay</TableHead>
                            <TableHead>PAYE</TableHead>
                            <TableHead>RSSB</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.monthlyData?.map((month: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{month.monthName} {month.year}</TableCell>
                              <TableCell>{month.employeeCount}</TableCell>
                              <TableCell>{formatCurrency(month.grossSalary)}</TableCell>
                              <TableCell className="font-medium">{formatCurrency(month.netPay)}</TableCell>
                              <TableCell className="text-red-600">{formatCurrency(month.paye)}</TableCell>
                              <TableCell className="text-orange-600">{formatCurrency(month.rssb)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Edit Payroll Record' : 'Add Employee to Payroll'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {/* Employee Information */}
                <div className="border-b pb-4">
                  <h3 className="font-medium mb-3">Employee Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Employee ID *</Label>
                      <Input
                        value={formData.employee.employeeId}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          employee: { ...formData.employee, employeeId: e.target.value } 
                        })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>National ID</Label>
                      <Input
                        value={formData.employee.nationalId}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          employee: { ...formData.employee, nationalId: e.target.value } 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        value={formData.employee.firstName}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          employee: { ...formData.employee, firstName: e.target.value } 
                        })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input
                        value={formData.employee.lastName}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          employee: { ...formData.employee, lastName: e.target.value } 
                        })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.employee.email}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          employee: { ...formData.employee, email: e.target.value } 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={formData.employee.phone}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          employee: { ...formData.employee, phone: e.target.value } 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input
                        value={formData.employee.department}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          employee: { ...formData.employee, department: e.target.value } 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Input
                        value={formData.employee.position}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          employee: { ...formData.employee, position: e.target.value } 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input
                        value={formData.employee.bankName}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          employee: { ...formData.employee, bankName: e.target.value } 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Account</Label>
                      <Input
                        value={formData.employee.bankAccount}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          employee: { ...formData.employee, bankAccount: e.target.value } 
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Salary Information */}
                <div className="border-b pb-4">
                  <h3 className="font-medium mb-3">Salary Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Basic Salary *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.salary.basicSalary}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          salary: { ...formData.salary, basicSalary: parseFloat(e.target.value) || 0 } 
                        })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Transport Allowance</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.salary.transportAllowance}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          salary: { ...formData.salary, transportAllowance: parseFloat(e.target.value) || 0 } 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Housing Allowance</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.salary.housingAllowance}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          salary: { ...formData.salary, housingAllowance: parseFloat(e.target.value) || 0 } 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Allowances</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.salary.otherAllowances}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          salary: { ...formData.salary, otherAllowances: parseFloat(e.target.value) || 0 } 
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Period */}
                <div className="border-b pb-4">
                  <h3 className="font-medium mb-3">Pay Period</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Month *</Label>
                      <Select 
                        value={String(formData.period.month)} 
                        onValueChange={(v) => setFormData({ 
                          ...formData, 
                          period: { ...formData.period, month: parseInt(v) } 
                        })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <SelectItem key={m} value={String(m)}>{getMonthName(m)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Year *</Label>
                      <Select 
                        value={String(formData.period.year)} 
                        onValueChange={(v) => setFormData({ 
                          ...formData, 
                          period: { ...formData.period, year: parseInt(v) } 
                        })}
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
                </div>

                {/* Calculated Values */}
                {calculatedValues && (
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Calculated Values (Rwanda Tax)
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Gross Salary:</div>
                      <div className="font-medium">{formatCurrency(calculatedValues.grossSalary)}</div>
                      
                      <div className="text-red-600">PAYE (Income Tax):</div>
                      <div className="font-medium text-red-600">-{formatCurrency(calculatedValues.deductions.paye)}</div>
                      
                      <div className="text-orange-600">RSSB Employee (3%):</div>
                      <div className="font-medium text-orange-600">-{formatCurrency(calculatedValues.deductions.rssbEmployee)}</div>
                      
                      <div className="font-semibold">Total Deductions:</div>
                      <div className="font-semibold text-red-600">-{formatCurrency(calculatedValues.deductions.totalDeductions)}</div>
                      
                      <div className="font-bold text-lg">Net Pay:</div>
                      <div className="font-bold text-lg text-green-600">{formatCurrency(calculatedValues.netPay)}</div>
                    </div>
                    
                    {/* Employer Contributions */}
                    <div className="mt-4 pt-4 border-t text-sm">
                      <h4 className="font-medium mb-2">Employer Contributions:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>RSSB Employer (5%):</div>
                        <div>{formatCurrency(calculatedValues.contributions.rssbEmployer)}</div>
                        <div>Maternity (0.6%):</div>
                        <div>{formatCurrency(calculatedValues.contributions.maternity)}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingRecord ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Payment Method Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Select Payment Method</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label className="mb-2 block">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                This will determine which cash account is credited in the journal entry.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleProcessPayment} className="bg-green-600 hover:bg-green-700">
                Process Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* PAYE Payment Dialog */}
        <Dialog open={isPAYEPaymentDialogOpen} onOpenChange={setIsPAYEPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-red-600" />
                Pay PAYE Tax to RRA
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-800 dark:text-red-200">
                  This will record PAYE payment to Rwanda Revenue Authority and reduce your PAYE liability:
                </p>
                <div className="mt-2 text-xs font-mono text-red-700 dark:text-red-300">
                  DR 2200 PAYE Payable (reduce liability)<br/>
                  CR [Selected Payment Method] (cash outflow)
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount to Pay</Label>
                <Input
                  type="number"
                  min="0"
                  value={payePaymentData.amount}
                  onChange={(e) => setPayePaymentData({ 
                    ...payePaymentData, 
                    amount: parseFloat(e.target.value) || 0 
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select 
                  value={payePaymentData.paymentMethod} 
                  onValueChange={(v) => setPayePaymentData({ 
                    ...payePaymentData, 
                    paymentMethod: v 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={payePaymentData.reference}
                  onChange={(e) => setPayePaymentData({ 
                    ...payePaymentData, 
                    reference: e.target.value 
                  })}
                  placeholder="e.g., RRA Receipt Number"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={payePaymentData.notes}
                  onChange={(e) => setPayePaymentData({ 
                    ...payePaymentData, 
                    notes: e.target.value 
                  })}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPAYEPaymentDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handlePayPAYE} 
                disabled={payingPAYE || payePaymentData.amount <= 0}
                className="bg-red-600 hover:bg-red-700"
              >
                {payingPAYE ? 'Processing...' : 'Pay PAYE'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* RSSB Payment Dialog */}
        <Dialog open={isRSSBPaymentDialogOpen} onOpenChange={setIsRSSBPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-orange-600" />
                Pay RSSB to RSSB
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  This will record RSSB (social security) payment to Rwanda Social Security Board and reduce your RSSB liability:
                </p>
                <div className="mt-2 text-xs font-mono text-orange-700 dark:text-orange-300">
                  DR 2300 RSSB Payable (reduce liability)<br/>
                  CR [Selected Payment Method] (cash outflow)
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount to Pay</Label>
                <Input
                  type="number"
                  min="0"
                  value={rssbPaymentData.amount}
                  onChange={(e) => setRssbPaymentData({ 
                    ...rssbPaymentData, 
                    amount: parseFloat(e.target.value) || 0 
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select 
                  value={rssbPaymentData.paymentMethod} 
                  onValueChange={(v) => setRssbPaymentData({ 
                    ...rssbPaymentData, 
                    paymentMethod: v 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={rssbPaymentData.reference}
                  onChange={(e) => setRssbPaymentData({ 
                    ...rssbPaymentData, 
                    reference: e.target.value 
                  })}
                  placeholder="e.g., RSSB Receipt Number"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={rssbPaymentData.notes}
                  onChange={(e) => setRssbPaymentData({ 
                    ...rssbPaymentData, 
                    notes: e.target.value 
                  })}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRSSBPaymentDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handlePayRSSB} 
                disabled={payingRSSB || rssbPaymentData.amount <= 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {payingRSSB ? 'Processing...' : 'Pay RSSB'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payslip Dialog */}
        <Dialog open={isPayslipOpen} onOpenChange={setIsPayslipOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Payslip - {selectedRecord?.employee.firstName} {selectedRecord?.employee.lastName}</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="text-center border-b pb-2 mb-2">
                    <h3 className="font-bold">PAYSLIP</h3>
                    <p className="text-sm">{getMonthName(selectedRecord.period.month)} {selectedRecord.period.year}</p>
                  </div>
                  
                  <div className="mb-4">
                    <p className="font-medium">{selectedRecord.employee.firstName} {selectedRecord.employee.lastName}</p>
                    <p className="text-sm text-muted-foreground">ID: {selectedRecord.employee.employeeId}</p>
                    {selectedRecord.employee.department && (
                      <p className="text-sm text-muted-foreground">{selectedRecord.employee.department}</p>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-t pt-2">
                      <span>Basic Salary</span>
                      <span>{formatCurrency(selectedRecord.salary.basicSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transport Allowance</span>
                      <span>{formatCurrency(selectedRecord.salary.transportAllowance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Housing Allowance</span>
                      <span>{formatCurrency(selectedRecord.salary.housingAllowance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Other Allowances</span>
                      <span>{formatCurrency(selectedRecord.salary.otherAllowances)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Gross Salary</span>
                      <span>{formatCurrency(selectedRecord.salary.grossSalary)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mt-4">
                    <div className="flex justify-between text-red-600">
                      <span>PAYE (Income Tax)</span>
                      <span>-{formatCurrency(selectedRecord.deductions.paye)}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>RSSB (3%)</span>
                      <span>-{formatCurrency(selectedRecord.deductions.rssbEmployee)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Total Deductions</span>
                      <span className="text-red-600">-{formatCurrency(selectedRecord.deductions.totalDeductions)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t-2 border-black">
                    <div className="flex justify-between font-bold text-lg">
                      <span>NET PAY</span>
                      <span className="text-green-600">{formatCurrency(selectedRecord.netPay)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  <p>Payment Status: {selectedRecord.payment.status === 'paid' ? 'PAID' : 'PENDING'}</p>
                  {selectedRecord.employee.bankName && (
                    <p>Bank: {selectedRecord.employee.bankName} - {selectedRecord.employee.bankAccount}</p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPayslipOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
