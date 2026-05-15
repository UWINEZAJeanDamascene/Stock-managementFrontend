import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { employeeAdvanceApi } from '@/lib/api';
import { employeeApi } from '@/lib/api.employees';
import type { Employee as ApiEmployee } from '@/lib/api.employees';
import { Layout } from '../../layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Wallet, ArrowLeft, Loader2, Save, User, Banknote, Calendar,
  Receipt, ToggleLeft, ToggleRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeAdvanceFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isRepayment = id && location.pathname.includes('/repayment');
  const isSettlement = id && location.pathname.includes('/settlement');
  const isEdit = id && !isRepayment && !isSettlement && location.pathname.includes('/edit');

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);

  // Issue form state
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // Repayment form state
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
  const [repayMethod, setRepayMethod] = useState('cash');
  const [repayNotes, setRepayNotes] = useState('');

  // Settlement form state
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseAccountCode, setExpenseAccountCode] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleNotes, setSettleNotes] = useState('');
  const [advanceBalance, setAdvanceBalance] = useState(0);

  useEffect(() => {
    fetchEmployees();
    if (isSettlement && id) fetchAdvanceBalance();
  }, [isSettlement, id]);

  const fetchAdvanceBalance = async () => {
    try {
      const response: any = await employeeAdvanceApi.getById(id!);
      if (response.success) {
        setAdvanceBalance(response.data?.balance || 0);
      }
    } catch (err) {
      console.error('Failed to fetch advance balance:', err);
    }
  };

  const fetchEmployees = async () => {
    setFetching(true);
    try {
      const response = await employeeApi.getAll();
      if (response.success) {
        setEmployees(response.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch employees:', err);
      toast.error(err?.message || 'Failed to load employees');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSettlement) {
        const expAmt = parseFloat(expenseAmount) || 0;
        const refAmt = parseFloat(refundAmount) || 0;
        if (expAmt <= 0 && refAmt <= 0) {
          toast.error('At least expense amount or refund amount must be greater than zero');
          setLoading(false);
          return;
        }
        if (expAmt > 0 && !expenseAccountCode) {
          toast.error('Expense account code is required when claiming an expense');
          setLoading(false);
          return;
        }
        if (expAmt + refAmt > advanceBalance) {
          toast.error(`Total settlement (${expAmt + refAmt}) cannot exceed advance balance (${advanceBalance})`);
          setLoading(false);
          return;
        }
        const response: any = await employeeAdvanceApi.settle(id!, {
          expenseAmount: expAmt > 0 ? expAmt : undefined,
          expenseAccountCode: expAmt > 0 ? expenseAccountCode : undefined,
          expenseDescription: expAmt > 0 ? expenseDescription : undefined,
          refundAmount: refAmt > 0 ? refAmt : undefined,
          refundMethod: refAmt > 0 ? refundMethod : undefined,
          notes: settleNotes,
          date: settleDate,
        });
        if (response.success) {
          toast.success(response.message || 'Advance settled successfully');
          navigate('/payroll');
        }
      } else if (isRepayment) {
        if (!repayAmount || parseFloat(repayAmount) <= 0) {
          toast.error('Repayment amount must be greater than zero');
          setLoading(false);
          return;
        }
        const response: any = await employeeAdvanceApi.recordRepayment(id!, {
          amount: parseFloat(repayAmount),
          date: repayDate,
          paymentMethod: repayMethod,
          notes: repayNotes,
        });
        if (response.success) {
          toast.success(response.message || 'Repayment recorded successfully');
          navigate('/payroll');
        }
      } else {
        if (!employeeId || !amount || parseFloat(amount) <= 0) {
          toast.error('Employee and positive amount are required');
          setLoading(false);
          return;
        }
        const response: any = await employeeAdvanceApi.create({
          employeeId,
          amount: parseFloat(amount),
          description,
          issueDate,
          dueDate: dueDate || undefined,
          paymentMethod,
          notes,
        });
        if (response.success) {
          toast.success(response.message || 'Advance issued successfully');
          navigate('/payroll');
        }
      }
    } catch (error: any) {
      console.error('[EmployeeAdvanceFormPage] Submit failed:', error);
      toast.error(error?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = isSettlement
    ? 'Settle Advance'
    : isRepayment
    ? 'Record Repayment'
    : isEdit
    ? 'Edit Advance'
    : 'New Employee Advance';

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/payroll')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Wallet className="h-6 w-6 text-indigo-500" />
              {pageTitle}
            </h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isSettlement ? 'Settlement Details' : isRepayment ? 'Repayment Details' : 'Advance Details'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {isSettlement ? (
                // Settlement form (expense claim + refund)
                <>
                  {advanceBalance > 0 && (
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 text-sm">
                      <span className="text-muted-foreground">Advance balance:</span>{' '}
                      <span className="font-semibold text-amber-600">{advanceBalance.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expenseAmount">Expense Claim Amount</Label>
                      <Input
                        id="expenseAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 65000"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expenseAccountCode">Expense Account Code</Label>
                      <Input
                        id="expenseAccountCode"
                        placeholder="e.g. 5650"
                        value={expenseAccountCode}
                        onChange={(e) => setExpenseAccountCode(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expenseDescription">Expense Description</Label>
                    <Input
                      id="expenseDescription"
                      placeholder="e.g. Travel & Local Transport"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="refundAmount">Cash Refund Amount</Label>
                      <Input
                        id="refundAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 15000"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="refundMethod">Refund Payment Method</Label>
                      <Select value={refundMethod} onValueChange={setRefundMethod}>
                        <SelectTrigger id="refundMethod">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money (MoMo)</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settleDate">Settlement Date *</Label>
                    <Input
                      id="settleDate"
                      type="date"
                      value={settleDate}
                      onChange={(e) => setSettleDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settleNotes">Notes</Label>
                    <Textarea
                      id="settleNotes"
                      placeholder="Optional notes about this settlement"
                      value={settleNotes}
                      onChange={(e) => setSettleNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              ) : isRepayment ? (
                // Repayment form
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="repayAmount">Repayment Amount *</Label>
                      <Input
                        id="repayAmount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter repayment amount"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="repayDate">Repayment Date *</Label>
                      <Input
                        id="repayDate"
                        type="date"
                        value={repayDate}
                        onChange={(e) => setRepayDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repayMethod">Payment Method *</Label>
                    <Select value={repayMethod} onValueChange={setRepayMethod}>
                      <SelectTrigger id="repayMethod">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money (MoMo)</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="payroll_deduction">Payroll Deduction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repayNotes">Notes</Label>
                    <Textarea
                      id="repayNotes"
                      placeholder="Optional notes about this repayment"
                      value={repayNotes}
                      onChange={(e) => setRepayNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                // New advance form
                <>
                  <div className="space-y-2">
                    <Label htmlFor="employee">Employee *</Label>
                    <Select value={employeeId} onValueChange={setEmployeeId}>
                      <SelectTrigger id="employee">
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp._id} value={emp._id}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {emp.firstName} {emp.lastName} ({emp.employeeId})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter advance amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="issueDate">Issue Date *</Label>
                      <Input
                        id="issueDate"
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money (MoMo)</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="e.g. Travel advance for conference"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Expected Repayment Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Optional additional notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/payroll')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSettlement ? 'Record Settlement' : isRepayment ? 'Record Repayment' : 'Issue Advance'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
