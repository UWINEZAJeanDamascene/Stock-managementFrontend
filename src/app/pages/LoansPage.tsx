import React, { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { loansApi, purchasesApi, companyApi, invoicesApi, reportsApi } from '@/lib/api';
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
import { Banknote, Plus, Pencil, Trash2, DollarSign, CreditCard, FileText, TrendingUp, PieChart, Save, Eye, Bell, AlertTriangle } from 'lucide-react';

// ── Schedule helper functions ─────────────────────────────────────────────────

/** Simple interest: fixed monthly interest on the original principal */
function computeSimpleSchedule(principal: number, annualRate: number, months: number) {
  const monthlyRatePct = annualRate / 12;                   // e.g. 1% for 12% annual
  const monthlyInterest = principal * (monthlyRatePct / 100);
  const rows = Array.from({ length: months }, (_, i) => ({
    month: i + 1,
    principal,
    interest: Math.round(monthlyInterest),
  }));
  const totalInterest = Math.round(monthlyInterest * months);
  return {
    rows,
    totalInterest,
    totalRepayment: Math.round(principal + totalInterest),
    monthlyRatePct: monthlyRatePct.toFixed(4),
  };
}

/** Compound / EMI: full amortisation schedule */
function computeEMISchedule(principal: number, annualRate: number, months: number) {
  const r = annualRate / 100 / 12;
  const n = months;
  const emi = r > 0
    ? (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    : principal / n;

  let balance = principal;
  let totalInterest = 0;
  let totalPrincipalPaid = 0;
  const rows: Array<{
    month: number; openingBalance: number; payment: number;
    interest: number; principal: number; closingBalance: number;
  }> = [];

  for (let m = 1; m <= n; m++) {
    const interest      = balance * r;
    const principalPaid = Math.min(emi - interest, balance);
    const closing       = Math.max(0, balance - principalPaid);

    rows.push({
      month: m,
      openingBalance: Math.round(balance),
      payment:        Math.round(emi),
      interest:       Math.round(interest),
      principal:      Math.round(principalPaid),
      closingBalance: Math.round(closing),
    });

    totalInterest      += interest;
    totalPrincipalPaid += principalPaid;
    balance             = closing;
    if (balance < 0.01) break;
  }

  return {
    rows,
    emi:            Math.round(emi),
    totalPayment:   Math.round(emi * n),
    totalInterest:  Math.round(totalInterest),
    totalPrincipal: Math.round(totalPrincipalPaid),
  };
}

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Loan {
  _id: string;
  loanNumber?: string;
  lenderName: string;
  loanType: string;
  purpose?: string;
  originalAmount: number;
  interestRate: number;
  interestMethod: 'simple' | 'compound';
  durationMonths?: number;
  startDate: string;
  endDate?: string;
  status: string;
  amountPaid: number;
  remainingBalance: number;
  monthlyPayment?: number;
  payments: any[];
}

interface Purchase {
  _id: string;
  supplier?: { name: string };
  status: string;
  roundedAmount?: number;
  grandTotal?: number;
  amountPaid?: number;
  balance?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [unpaidPurchases, setUnpaidPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [activeTab, setActiveTab] = useState<'loans' | 'current' | 'non-current' | 'equity'>('loans');

  // Schedule dialog
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleLoan, setScheduleLoan] = useState<Loan | null>(null);

  // VAT state
  const [vatPayable, setVatPayable] = useState(0);
  const [outputVat, setOutputVat] = useState(0);
  const [inputVat, setInputVat] = useState(0);

  // Equity state
  const [equity, setEquity] = useState({
    shareCapital: 0,
    retainedEarnings: 0,
    currentPeriodProfit: 0
  });
  const [equityFormData, setEquityFormData] = useState({
    shareCapital: 0,
    retainedEarnings: 0
  });
  
  // Balance Sheet Manual Entries state
  const [balanceSheetEntries, setBalanceSheetEntries] = useState({
    accruedExpenses: 0,
    otherLongTermLiabilities: 0,
    currentLiabilities: [] as Array<{name: string; amount: number; description?: string}>,
    nonCurrentLiabilities: [] as Array<{name: string; amount: number; description?: string; dueDate?: string}>
  });
  const [balanceSheetFormData, setBalanceSheetFormData] = useState({
    accruedExpenses: 0,
    otherLongTermLiabilities: 0,
    currentLiabilities: [] as Array<{name: string; amount: number; description?: string}>,
    nonCurrentLiabilities: [] as Array<{name: string; amount: number; description?: string; dueDate?: string}>
  });
  const [newCurrentLiability, setNewCurrentLiability] = useState({ name: '', amount: 0, description: '' });
  const [newNonCurrentLiability, setNewNonCurrentLiability] = useState({ name: '', amount: 0, description: '', dueDate: '' });
  const [isBalanceSheetDialogOpen, setIsBalanceSheetDialogOpen] = useState(false);
  const [isEquityDialogOpen, setIsEquityDialogOpen] = useState(false);

  // Accrued interest (simple interest loans — full duration, recognised immediately)
  const [accruedInterest, setAccruedInterest] = useState(0);

  // Balance Sheet Summary state
  const [balanceSheetSummary, setBalanceSheetSummary] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0
  });

  const [formData, setFormData] = useState({
    lenderName: '',
    loanType: 'short-term',
    purpose: '',
    originalAmount: 0,
    interestRate: 0,
    interestMethod: 'simple',
    durationMonths: 12,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    monthlyPayment: 0,
    paymentMethod: 'bank_transfer',
    collateral: '',
    notes: ''
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'bank_transfer',
    reference: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch loans
      const loansRes = await loansApi.getAll();
      setLoans(loansRes.data as Loan[]);
      
      // Fetch all purchases - filter on client side for received/partial status
      const purchasesRes = await purchasesApi.getAll();
      const purchasesData = purchasesRes.data as any;
      const purchasesArray = purchasesData?.data || purchasesData || [];
      const unpaid = Array.isArray(purchasesArray) ? purchasesArray.filter((p: any) => 
        (p.status === 'received' || p.status === 'partial') 
      ) : [];
      setUnpaidPurchases(unpaid);
      
      // Calculate VAT
      try {
        const invoicesRes = await invoicesApi.getAll();
        const invoicesData = invoicesRes.data as any;
        const invoicesArray = invoicesData?.data || invoicesData || [];
        const vatInvoices = Array.isArray(invoicesArray) 
          ? invoicesArray.filter((inv: any) => 
              inv.status === 'confirmed' || inv.status === 'partial' || inv.status === 'paid'
            )
          : [];
        const totalOutputVat = vatInvoices.reduce((sum: number, inv: any) => 
          sum + (inv.totalTax || inv.taxAmount || 0), 0
        );
        setOutputVat(totalOutputVat);
        const totalInputVat = Array.isArray(purchasesArray)
          ? purchasesArray
              .filter((p: any) => p.status === 'received' || p.status === 'partial' || p.status === 'paid')
              .reduce((sum: number, p: any) => sum + (p.taxAmount || p.totalTax || 0), 0)
          : 0;
        setInputVat(totalInputVat);
        setVatPayable(totalOutputVat - totalInputVat);
      } catch (vatErr) {
        console.error('Failed to calculate VAT:', vatErr);
      }
      
      // Fetch equity data
      try {
        const equityRes = await companyApi.getMe();
        const company = equityRes.data as { 
          equity?: { shareCapital?: number; retainedEarnings?: number };
          assets?: { prepaidExpenses?: number };
          liabilities?: { 
            accruedExpenses?: number; 
            otherLongTermLiabilities?: number;
            currentLiabilities?: Array<{name: string; amount: number; description?: string}>;
            nonCurrentLiabilities?: Array<{name: string; amount: number; description?: string; dueDate?: string}>;
          };
        };
        setEquity({
          shareCapital: company?.equity?.shareCapital || 0,
          retainedEarnings: company?.equity?.retainedEarnings || 0,
          currentPeriodProfit: 0
        });
        setEquityFormData({
          shareCapital: company?.equity?.shareCapital || 0,
          retainedEarnings: company?.equity?.retainedEarnings || 0
        });
        setBalanceSheetEntries({
          accruedExpenses: company?.liabilities?.accruedExpenses || 0,
          otherLongTermLiabilities: company?.liabilities?.otherLongTermLiabilities || 0,
          currentLiabilities: company?.liabilities?.currentLiabilities || [],
          nonCurrentLiabilities: company?.liabilities?.nonCurrentLiabilities || []
        });
        setBalanceSheetFormData({
          accruedExpenses: company?.liabilities?.accruedExpenses || 0,
          otherLongTermLiabilities: company?.liabilities?.otherLongTermLiabilities || 0,
          currentLiabilities: company?.liabilities?.currentLiabilities || [],
          nonCurrentLiabilities: company?.liabilities?.nonCurrentLiabilities || []
        });
      } catch (eqErr) {
        console.error('Failed to fetch equity:', eqErr);
      }
      
      // Fetch Current Period Profit from P&L
      try {
        const plRes = await reportsApi.getProfitAndLoss({});
        const plData = plRes.data as any;
        const netProfit = plData?.netProfit || 0;
        setEquity(prev => ({ ...prev, currentPeriodProfit: netProfit }));
      } catch (plErr) {
        console.error('Failed to fetch P&L for current period profit:', plErr);
      }

      // Fetch Balance Sheet Summary
      try {
        const bsRes = await reportsApi.getBalanceSheet({});
        const bsData = bsRes.data as any;
        setBalanceSheetSummary({
          totalAssets: bsData?.assets?.totalAssets || bsData?.totalAssets || 0,
          totalLiabilities: bsData?.liabilities?.totalLiabilities || bsData?.totalLiabilities || 0,
          totalEquity: bsData?.equity?.totalEquity || bsData?.totalEquity || 0
        });
        // Accrued interest on simple interest loans (full duration, recorded immediately)
        setAccruedInterest(bsData?.liabilities?.currentLiabilities?.accruedInterest || 0);
      } catch (bsErr) {
        console.error('Failed to fetch Balance Sheet:', bsErr);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

  const formatNum = (n: number) => Math.round(n).toLocaleString('en-US');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData, endDate: formData.endDate || undefined };
      if (editingLoan) {
        await loansApi.update(editingLoan._id, dataToSend);
      } else {
        await loansApi.create(dataToSend);
      }
      setIsDialogOpen(false);
      setEditingLoan(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save loan');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    try {
      await loansApi.recordPayment(selectedLoan._id, paymentData);
      setIsPaymentDialogOpen(false);
      setSelectedLoan(null);
      setPaymentData({ amount: 0, paymentMethod: 'bank_transfer', reference: '', notes: '' });
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment');
    }
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      lenderName: loan.lenderName,
      loanType: loan.loanType,
      purpose: loan.purpose || '',
      originalAmount: loan.originalAmount,
      interestRate: loan.interestRate,
      interestMethod: loan.interestMethod || (loan.loanType === 'long-term' ? 'compound' : 'simple'),
      durationMonths: loan.durationMonths || (loan.endDate
        ? Math.max(1, Math.round((new Date(loan.endDate).getTime() - new Date(loan.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
        : 12),
      startDate: new Date(loan.startDate).toISOString().split('T')[0],
      endDate: loan.endDate ? new Date(loan.endDate).toISOString().split('T')[0] : '',
      monthlyPayment: loan.monthlyPayment || 0,
      paymentMethod: (loan as any).paymentMethod || 'bank_transfer',
      collateral: '',
      notes: ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this loan?')) return;
    try {
      await loansApi.delete(id);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete loan');
    }
  };

  const openPaymentDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setPaymentData({
      amount: loan.monthlyPayment || loan.remainingBalance || 0,
      paymentMethod: 'bank_transfer',
      reference: '',
      notes: ''
    });
    setIsPaymentDialogOpen(true);
  };

  const openScheduleDialog = (loan: Loan) => {
    setScheduleLoan(loan);
    setScheduleDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      lenderName: '',
      loanType: 'short-term',
      purpose: '',
      originalAmount: 0,
      interestRate: 0,
      interestMethod: 'simple',
      durationMonths: 12,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      monthlyPayment: 0,
      paymentMethod: 'bank_transfer',
      collateral: '',
      notes: ''
    });
  };

  const openNewDialog = () => {
    setEditingLoan(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleUpdateEquity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await companyApi.update({
        equity: {
          shareCapital: equityFormData.shareCapital,
          retainedEarnings: equityFormData.retainedEarnings
        }
      });
      setIsEquityDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update equity');
    }
  };

  const handleUpdateBalanceSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await companyApi.update({
        liabilities: {
          accruedExpenses: balanceSheetFormData.accruedExpenses,
          otherLongTermLiabilities: balanceSheetFormData.otherLongTermLiabilities,
          currentLiabilities: balanceSheetFormData.currentLiabilities,
          nonCurrentLiabilities: balanceSheetFormData.nonCurrentLiabilities
        }
      });
      setIsBalanceSheetDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update balance sheet entries');
    }
  };

  const handleAddCurrentLiability = () => {
    if (newCurrentLiability.name && newCurrentLiability.amount > 0) {
      setBalanceSheetFormData({
        ...balanceSheetFormData,
        currentLiabilities: [...balanceSheetFormData.currentLiabilities, { ...newCurrentLiability }]
      });
      setNewCurrentLiability({ name: '', amount: 0, description: '' });
    }
  };

  const handleRemoveCurrentLiability = (index: number) => {
    const updated = [...balanceSheetFormData.currentLiabilities];
    updated.splice(index, 1);
    setBalanceSheetFormData({ ...balanceSheetFormData, currentLiabilities: updated });
  };

  const handleAddNonCurrentLiability = () => {
    if (newNonCurrentLiability.name && newNonCurrentLiability.amount > 0) {
      setBalanceSheetFormData({
        ...balanceSheetFormData,
        nonCurrentLiabilities: [...balanceSheetFormData.nonCurrentLiabilities, { ...newNonCurrentLiability }]
      });
      setNewNonCurrentLiability({ name: '', amount: 0, description: '', dueDate: '' });
    }
  };

  const handleRemoveNonCurrentLiability = (index: number) => {
    const updated = [...balanceSheetFormData.nonCurrentLiabilities];
    updated.splice(index, 1);
    setBalanceSheetFormData({ ...balanceSheetFormData, nonCurrentLiabilities: updated });
  };

  // Separate loans by type
  const shortTermLoans = loans.filter(loan => loan.loanType === 'short-term');
  const longTermLoans  = loans.filter(loan => loan.loanType === 'long-term');
  const shortTermTotal = shortTermLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
  const longTermTotal  = longTermLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
  const accountsPayableTotal = unpaidPurchases.reduce((sum, p) => sum + (p.balance || 0), 0);

  // ── Schedule dialog rendering helper ─────────────────────────────────────
  const renderSchedule = () => {
    if (!scheduleLoan) return null;
    const principal = scheduleLoan.originalAmount;
    const rate      = scheduleLoan.interestRate;
    const months    = scheduleLoan.durationMonths || (
      scheduleLoan.endDate
        ? Math.max(1, Math.round((new Date(scheduleLoan.endDate).getTime() - new Date(scheduleLoan.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
        : 12
    );
    const isCompound = scheduleLoan.interestMethod === 'compound';

    if (!isCompound) {
      // ── Simple Interest Table ─────────────────────────────────────────────
      const { rows, totalInterest, totalRepayment, monthlyRatePct } = computeSimpleSchedule(principal, rate, months);
      return (
        <div className="bg-slate-900 rounded-lg p-5 font-mono text-sm space-y-3">
          <div className="space-y-1 text-green-400">
            <div>Loan Amount:    RF {formatNum(principal)}</div>
            <div>Interest Rate:  {rate}% per year</div>
            <div>Duration:       {months} months</div>
            <div>Method:         Simple Interest</div>
          </div>
          <div className="text-yellow-300">
            Monthly Rate = {rate}% / 12 = {monthlyRatePct}% per month
          </div>
          <div className="space-y-0.5 text-green-300 max-h-72 overflow-y-auto pr-1">
            {rows.map(r => (
              <div key={r.month}>
                Month {String(r.month).padStart(2, ' ')}: RF {formatNum(r.principal)} × {monthlyRatePct}% = RF {formatNum(r.interest)}
              </div>
            ))}
          </div>
          <div className="border-t border-slate-600 pt-3 space-y-1 text-green-200">
            <div className="flex justify-between">
              <span>Total Interest:</span>
              <span className="text-white font-bold">RF {formatNum(totalInterest)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Repayment:</span>
              <span className="text-white font-bold">RF {formatNum(totalRepayment)}</span>
            </div>
          </div>
        </div>
      );
    } else {
      // ── EMI / Amortisation Table ──────────────────────────────────────────
      const { rows, emi, totalPayment, totalInterest, totalPrincipal } = computeEMISchedule(principal, rate, months);
      const displayRows: (typeof rows[0] | null)[] =
        rows.length > 8
          ? [...rows.slice(0, 5), null, ...rows.slice(-3)]
          : rows;
      return (
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-300 overflow-x-auto">
          <div className="text-green-400 mb-3 text-xs">
            EMI = RF {formatNum(emi)} / month &nbsp;|&nbsp; Total months: {months} &nbsp;|&nbsp; Rate: {rate}% p.a.
          </div>
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="text-green-400 border-b border-slate-600">
                <th className="text-left py-2 pr-4 font-semibold">Month</th>
                <th className="py-2 px-2 font-semibold">Opening Balance</th>
                <th className="py-2 px-2 font-semibold">Payment</th>
                <th className="py-2 px-2 font-semibold">Interest</th>
                <th className="py-2 px-2 font-semibold">Principal</th>
                <th className="py-2 px-2 font-semibold">Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, idx) =>
                row === null ? (
                  <tr key={`ellipsis-${idx}`}>
                    <td colSpan={6} className="py-1 text-center text-slate-500">...</td>
                  </tr>
                ) : (
                  <tr key={row.month} className="border-b border-slate-800">
                    <td className="text-left py-1 pr-4">{row.month}</td>
                    <td className="py-1 px-2">{formatNum(row.openingBalance)}</td>
                    <td className="py-1 px-2">{formatNum(row.payment)}</td>
                    <td className="py-1 px-2 text-yellow-300">{formatNum(row.interest)}</td>
                    <td className="py-1 px-2 text-blue-300">{formatNum(row.principal)}</td>
                    <td className="py-1 px-2">
                      {formatNum(row.closingBalance)}
                      {row.closingBalance === 0 && ' ✅'}
                    </td>
                  </tr>
                )
              )}
            </tbody>
            <tfoot>
              <tr className="text-green-200 font-bold border-t border-slate-600">
                <td className="text-left py-2 pr-4">Total</td>
                <td></td>
                <td className="py-2 px-2">{formatNum(totalPayment)}</td>
                <td className="py-2 px-2 text-yellow-300">{formatNum(totalInterest)}</td>
                <td className="py-2 px-2 text-blue-300">{formatNum(totalPrincipal)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      );
    }
  };

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Banknote className="h-6 w-6" />
            Liabilities
          </h1>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Loan
          </Button>
        </div>

        {error && <div className="text-red-600 dark:text-red-400">{error}</div>}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-4 py-2 flex items-center gap-2 ${
              activeTab === 'loans' 
                ? 'border-b-2 border-primary font-semibold' 
                : 'text-muted-foreground'
            }`}
          >
            <Banknote className="h-4 w-4" />
            Loans & Alerts
          </button>
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 flex items-center gap-2 ${
              activeTab === 'current' 
                ? 'border-b-2 border-primary font-semibold' 
                : 'text-muted-foreground'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Current Liabilities
          </button>
          <button
            onClick={() => setActiveTab('non-current')}
            className={`px-4 py-2 flex items-center gap-2 ${
              activeTab === 'non-current' 
                ? 'border-b-2 border-primary font-semibold' 
                : 'text-muted-foreground'
            }`}
          >
            <Banknote className="h-4 w-4" />
            Non-Current Liabilities
          </button>
          <button
            onClick={() => setActiveTab('equity')}
            className={`px-4 py-2 flex items-center gap-2 ${
              activeTab === 'equity' 
                ? 'border-b-2 border-primary font-semibold' 
                : 'text-muted-foreground'
            }`}
          >
            <PieChart className="h-4 w-4" />
            Equity
          </button>
        </div>

        {/* LOANS & ALERTS TAB */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            {/* Payment Alerts Summary */}
            {(() => {
              const now = new Date();
              const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
              
              // Calculate upcoming payments
              const upcomingPayments = loans.filter(loan => {
                if (loan.status !== 'active') return false;
                if (!loan.durationMonths) return false;
                const startDate = new Date(loan.startDate);
                const monthsPassed = Math.floor((now.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
                const nextPaymentMonth = monthsPassed + 1;
                if (nextPaymentMonth > loan.durationMonths) return false;
                const paymentDueDate = new Date(startDate);
                paymentDueDate.setMonth(paymentDueDate.getMonth() + nextPaymentMonth);
                return paymentDueDate <= thirtyDaysFromNow;
              }).map(loan => {
                const startDate = new Date(loan.startDate);
                const monthsPassed = Math.floor((now.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
                const nextPaymentMonth = monthsPassed + 1;
                const paymentDueDate = new Date(startDate);
                paymentDueDate.setMonth(paymentDueDate.getMonth() + nextPaymentMonth);
                const daysUntilDue = Math.ceil((paymentDueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                return { loan, paymentDueDate, daysUntilDue, nextPaymentMonth };
              }).sort((a, b) => a.daysUntilDue - b.daysUntilDue);
              
              const overduePayments = upcomingPayments.filter(p => p.daysUntilDue < 0);
              const dueThisWeek = upcomingPayments.filter(p => p.daysUntilDue >= 0 && p.daysUntilDue <= 7);
              const dueThisMonth = upcomingPayments.filter(p => p.daysUntilDue > 7 && p.daysUntilDue <= 30);
              
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className={`${overduePayments.length > 0 ? 'bg-red-50 dark:bg-red-950 border-red-200' : 'bg-slate-50 dark:bg-slate-800'}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          Overdue
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">{overduePayments.length}</div>
                        <p className="text-xs text-muted-foreground">Payments past due date</p>
                      </CardContent>
                    </Card>
                    <Card className={`${dueThisWeek.length > 0 ? 'bg-orange-50 dark:bg-orange-950 border-orange-200' : 'bg-slate-50 dark:bg-slate-800'}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Bell className="h-4 w-4 text-orange-600" />
                          Due This Week
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{dueThisWeek.length}</div>
                        <p className="text-xs text-muted-foreground">Next 7 days</p>
                      </CardContent>
                    </Card>
                    <Card className={`${dueThisMonth.length > 0 ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200' : 'bg-slate-50 dark:bg-slate-800'}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Bell className="h-4 w-4 text-yellow-600" />
                          Due This Month
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{dueThisMonth.length}</div>
                        <p className="text-xs text-muted-foreground">Next 30 days</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(shortTermTotal + longTermTotal)}</div>
                        <p className="text-xs text-muted-foreground">{loans.filter(l => l.status === 'active').length} active loans</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Overdue Payments Alert */}
                  {overduePayments.length > 0 && (
                    <Card className="border-red-300 bg-red-50 dark:bg-red-950">
                      <CardHeader>
                        <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Overdue Payments - Action Required!
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Lender</TableHead>
                              <TableHead>Amount Due</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Days Overdue</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {overduePayments.map(({ loan, paymentDueDate }) => {
                              const monthlyPayment = loan.monthlyPayment || (loan.interestMethod === 'compound' 
                                ? (() => {
                                    const r = loan.interestRate / 100 / 12;
                                    const n = loan.durationMonths || 12;
                                    return r > 0 ? (loan.originalAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan.originalAmount / n;
                                  })()
                                : loan.originalAmount * loan.interestRate / 100 / 12);
                              const daysOverdue = Math.ceil((now.getTime() - paymentDueDate.getTime()) / (24 * 60 * 60 * 1000));
                              return (
                                <TableRow key={loan._id} className="bg-red-100 dark:bg-red-900/30">
                                  <TableCell className="font-medium">{loan.lenderName}</TableCell>
                                  <TableCell>{formatCurrency(monthlyPayment)}</TableCell>
                                  <TableCell>{paymentDueDate.toLocaleDateString()}</TableCell>
                                  <TableCell className="text-red-600 font-semibold">{daysOverdue} days</TableCell>
                                  <TableCell>
                                    <Button size="sm" onClick={() => openPaymentDialog(loan)}>
                                      <DollarSign className="h-4 w-4 mr-1" /> Pay Now
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {/* Upcoming Payments */}
                  {upcomingPayments.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Upcoming Payments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {upcomingPayments.map(({ loan, paymentDueDate, daysUntilDue, nextPaymentMonth }) => {
                            const monthlyPayment = loan.monthlyPayment || (loan.interestMethod === 'compound' 
                              ? (() => {
                                  const r = loan.interestRate / 100 / 12;
                                  const n = loan.durationMonths || 12;
                                  return r > 0 ? (loan.originalAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan.originalAmount / n;
                                })()
                              : loan.originalAmount * loan.interestRate / 100 / 12);
                            const alertLevel = daysUntilDue < 0 ? 'overdue' : daysUntilDue <= 7 ? 'week' : 'month';
                            return (
                              <div key={loan._id} className={`flex items-center justify-between p-3 rounded-lg ${
                                alertLevel === 'overdue' ? 'bg-red-100 dark:bg-red-900/30' :
                                alertLevel === 'week' ? 'bg-orange-100 dark:bg-orange-900/30' :
                                'bg-yellow-50 dark:bg-yellow-900/20'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${
                                    alertLevel === 'overdue' ? 'bg-red-200 dark:bg-red-800' :
                                    alertLevel === 'week' ? 'bg-orange-200 dark:bg-orange-800' :
                                    'bg-yellow-200 dark:bg-yellow-800'
                                  }`}>
                                    <Banknote className={`h-4 w-4 ${
                                      alertLevel === 'overdue' ? 'text-red-600' :
                                      alertLevel === 'week' ? 'text-orange-600' :
                                      'text-yellow-600'
                                    }`} />
                                  </div>
                                  <div>
                                    <p className="font-medium">{loan.lenderName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Payment #{nextPaymentMonth} of {loan.durationMonths}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">{formatCurrency(monthlyPayment)}</p>
                                  <p className={`text-xs ${
                                    alertLevel === 'overdue' ? 'text-red-600' :
                                    alertLevel === 'week' ? 'text-orange-600' :
                                    'text-yellow-600'
                                  }`}>
                                    {daysUntilDue < 0 
                                      ? `${Math.abs(daysUntilDue)} days overdue` 
                                      : daysUntilDue === 0 
                                        ? 'Due today' 
                                        : `Due in ${daysUntilDue} days`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{paymentDueDate.toLocaleDateString()}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => openPaymentDialog(loan)}>
                                  Pay
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* All Active Loans */}
                  <Card>
                    <CardHeader>
                      <CardTitle>All Active Loans</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loans.filter(l => l.status === 'active').length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No active loans. Click "Add Loan" to create one.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Lender</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Original</TableHead>
                              <TableHead>Remaining</TableHead>
                              <TableHead>Monthly Payment</TableHead>
                              <TableHead>Interest</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loans.filter(l => l.status === 'active').map((loan) => (
                              <TableRow key={loan._id}>
                                <TableCell className="font-medium">{loan.lenderName}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    loan.loanType === 'short-term' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {loan.loanType === 'short-term' ? 'Short-term' : 'Long-term'}
                                  </span>
                                </TableCell>
                                <TableCell>{formatCurrency(loan.originalAmount)}</TableCell>
                                <TableCell className="font-medium">{formatCurrency(loan.remainingBalance)}</TableCell>
                                <TableCell>
                                  {formatCurrency(loan.monthlyPayment || (loan.interestMethod === 'compound' 
                                    ? (() => {
                                        const r = loan.interestRate / 100 / 12;
                                        const n = loan.durationMonths || 12;
                                        return r > 0 ? (loan.originalAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan.originalAmount / n;
                                      })()
                                    : loan.originalAmount * loan.interestRate / 100 / 12))}
                                </TableCell>
                                <TableCell>{loan.interestRate}% ({loan.interestMethod})</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openScheduleDialog(loan)} title="View Schedule">
                                      <Eye className="h-4 w-4 text-blue-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => openPaymentDialog(loan)} title="Record Payment">
                                      <DollarSign className="h-4 w-4 text-green-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(loan)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(loan._id)}>
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
                </>
              );
            })()}
          </div>
        )}

        {/* CURRENT LIABILITIES SECTION */}
        {activeTab === 'current' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Accounts Payable
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(accountsPayableTotal)}</div>
                  <p className="text-xs text-muted-foreground">{unpaidPurchases.length} unpaid purchases</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{vatPayable >= 0 ? 'VAT Payable' : 'VAT Receivable'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${vatPayable >= 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(vatPayable))}</div>
                  <p className="text-xs text-muted-foreground">{vatPayable >= 0 ? 'You owe RRA' : 'RRA owes you'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Output: {formatCurrency(outputVat)} | Input: {formatCurrency(inputVat)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Short-term Loans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(shortTermTotal)}</div>
                  <p className="text-xs text-muted-foreground">{shortTermLoans.length} loans</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Current Liabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(accountsPayableTotal + (vatPayable >= 0 ? vatPayable : 0) + shortTermTotal + accruedInterest + balanceSheetEntries.accruedExpenses + (balanceSheetEntries.currentLiabilities?.reduce((sum: number, l: any) => sum + (l.amount || 0), 0) || 0))}</div>
                  <p className="text-xs text-muted-foreground">AP + VAT + Loans + Accrued Interest + Accrued + Custom</p>
                </CardContent>
              </Card>
            </div>

            {/* Accounts Payable Table */}
            <Card>
              <CardHeader>
                <CardTitle>Accounts Payable (Unpaid Purchases)</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : unpaidPurchases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No unpaid purchases found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Remaining</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unpaidPurchases.map((purchase) => (
                          <TableRow key={purchase._id}>
                            <TableCell className="font-medium">{purchase.supplier?.name || 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(purchase.roundedAmount || purchase.grandTotal || 0)}</TableCell>
                            <TableCell className="text-green-600">{formatCurrency(purchase.amountPaid || 0)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(purchase.balance || 0)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                purchase.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {purchase.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Short-term Loans Table */}
            <Card>
              <CardHeader>
                <CardTitle>Short-term Loans (≤1 year) — Simple Interest</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : shortTermLoans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No short-term loans found. Click "Add Loan" to create one.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lender</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>Original Amount</TableHead>
                          <TableHead>Amount Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Rate / Method</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shortTermLoans.map((loan) => (
                          <TableRow key={loan._id}>
                            <TableCell className="font-medium">{loan.lenderName}</TableCell>
                            <TableCell>{new Date(loan.startDate).toLocaleDateString()}</TableCell>
                            <TableCell>{formatCurrency(loan.originalAmount)}</TableCell>
                            <TableCell className="text-green-600">{formatCurrency(loan.amountPaid)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(loan.remainingBalance)}</TableCell>
                            <TableCell>
                              <span className="text-sm">{loan.interestRate}%</span>
                              <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                loan.interestMethod === 'compound'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {loan.interestMethod === 'compound' ? 'Compound' : 'Simple'}
                              </span>
                            </TableCell>
                            <TableCell>{loan.durationMonths ? `${loan.durationMonths} mo` : '—'}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                loan.status === 'active' ? 'bg-green-100 text-green-800' : 
                                loan.status === 'paid-off' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {loan.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openScheduleDialog(loan)} title="View Interest Schedule">
                                  <Eye className="h-4 w-4 text-blue-500" />
                                </Button>
                                {loan.status === 'active' && (
                                  <Button variant="ghost" size="icon" onClick={() => openPaymentDialog(loan)} title="Record Payment">
                                    <DollarSign className="h-4 w-4 text-green-500" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(loan)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(loan._id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Balance Sheet Entries - Current Liabilities */}
            <Card>
              <CardHeader>
                <CardTitle>Other Current Liabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Accrued Interest</p>
                        <p className="text-xs text-muted-foreground">All active loans (short + long term) — full term, auto-calculated</p>
                      </div>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(accruedInterest)}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Accrued Expenses</p>
                        <p className="text-xs text-muted-foreground">Manual entry</p>
                      </div>
                      <p className="text-lg font-bold text-amber-600">{formatCurrency(balanceSheetEntries.accruedExpenses)}</p>
                    </div>
                  </div>
                  {balanceSheetEntries.currentLiabilities?.map((liab: any, idx: number) => (
                    <div key={idx} className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{liab.name}</p>
                          <p className="text-xs text-muted-foreground">Custom liability</p>
                        </div>
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(liab.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" onClick={() => setIsBalanceSheetDialogOpen(true)}>
                    <Save className="h-4 w-4 mr-2" />
                    Edit Balance Sheet Entries
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* NON-CURRENT LIABILITIES SECTION */}
        {activeTab === 'non-current' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Long-term Loans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(longTermTotal)}</div>
                  <p className="text-xs text-muted-foreground">{longTermLoans.length} loans</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Other Long-term Liabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(balanceSheetEntries.otherLongTermLiabilities)}</div>
                  <p className="text-xs text-muted-foreground">Manual entry</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Custom Non-Current Liabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(balanceSheetEntries.nonCurrentLiabilities?.reduce((sum: number, l: any) => sum + (l.amount || 0), 0) || 0)}</div>
                  <p className="text-xs text-muted-foreground">{balanceSheetEntries.nonCurrentLiabilities?.length || 0} items</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Non-Current Liabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(longTermTotal + balanceSheetEntries.otherLongTermLiabilities + (balanceSheetEntries.nonCurrentLiabilities?.reduce((sum: number, l: any) => sum + (l.amount || 0), 0) || 0))}</div>
                </CardContent>
              </Card>
            </div>

            {/* Long-term Loans Table */}
            <Card>
              <CardHeader>
                <CardTitle>Long-term Loans (&gt;1 year) — Compound / EMI</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : longTermLoans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No long-term loans found. Click "Add Loan" to create one.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lender</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>Original Amount</TableHead>
                          <TableHead>Amount Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Rate / Method</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {longTermLoans.map((loan) => (
                          <TableRow key={loan._id}>
                            <TableCell className="font-medium">{loan.lenderName}</TableCell>
                            <TableCell>{new Date(loan.startDate).toLocaleDateString()}</TableCell>
                            <TableCell>{formatCurrency(loan.originalAmount)}</TableCell>
                            <TableCell className="text-green-600">{formatCurrency(loan.amountPaid)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(loan.remainingBalance)}</TableCell>
                            <TableCell>
                              <span className="text-sm">{loan.interestRate}%</span>
                              <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                loan.interestMethod === 'compound'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {loan.interestMethod === 'compound' ? 'Compound' : 'Simple'}
                              </span>
                            </TableCell>
                            <TableCell>{loan.durationMonths ? `${loan.durationMonths} mo` : '—'}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                loan.status === 'active' ? 'bg-green-100 text-green-800' : 
                                loan.status === 'paid-off' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {loan.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openScheduleDialog(loan)} title="View Amortisation Schedule">
                                  <Eye className="h-4 w-4 text-blue-500" />
                                </Button>
                                {loan.status === 'active' && (
                                  <Button variant="ghost" size="icon" onClick={() => openPaymentDialog(loan)} title="Record Payment">
                                    <DollarSign className="h-4 w-4 text-green-500" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(loan)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(loan._id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* EQUITY SECTION */}
        {activeTab === 'equity' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Share Capital
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(equity.shareCapital)}</div>
                  <p className="text-xs text-muted-foreground">Initial investment</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Retained Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(equity.retainedEarnings)}</div>
                  <p className="text-xs text-muted-foreground">Accumulated profits</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Current Period Profit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(equity.currentPeriodProfit)}</div>
                  <p className="text-xs text-muted-foreground">This period's profit (from P&amp;L)</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(equity.shareCapital + equity.retainedEarnings + equity.currentPeriodProfit)}</div>
                  <p className="text-xs text-muted-foreground">Share Capital + Retained + Profit</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setIsEquityDialogOpen(true)}>
                <Save className="h-4 w-4 mr-2" />
                Update Equity
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Balance Sheet Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Assets</p>
                    <p className="text-xl font-bold">{formatCurrency(balanceSheetSummary.totalAssets)}</p>
                  </div>
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">=</p>
                    <p className="text-xl font-bold">=</p>
                  </div>
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Liabilities + Equity</p>
                    <p className="text-xl font-bold">{formatCurrency(balanceSheetSummary.totalLiabilities + balanceSheetSummary.totalEquity)}</p>
                  </div>
                </div>
                {balanceSheetSummary.totalAssets === balanceSheetSummary.totalLiabilities + balanceSheetSummary.totalEquity && balanceSheetSummary.totalAssets > 0 ? (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg text-center text-green-600 font-medium">
                    ✅ Balanced
                  </div>
                ) : balanceSheetSummary.totalAssets > 0 ? (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg text-center text-red-600 font-medium">
                    ❌ Not Balanced — Difference: {formatCurrency(Math.abs(balanceSheetSummary.totalAssets - (balanceSheetSummary.totalLiabilities + balanceSheetSummary.totalEquity)))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Add / Edit Loan Dialog ──────────────────────────────────────────── */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingLoan ? 'Edit Loan' : 'Add Loan'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">

                {/* Lender & Type */}
                <div className="space-y-2">
                  <Label htmlFor="lenderName">Lender Name *</Label>
                  <Input
                    id="lenderName"
                    value={formData.lenderName}
                    onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loanType">Loan Type *</Label>
                  <Select
                    value={formData.loanType}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      loanType: value,
                      // default method by loan type
                      interestMethod: value === 'long-term' ? 'compound' : 'simple',
                      durationMonths: value === 'long-term' ? 36 : 12,
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short-term">Short-term (≤1 year)</SelectItem>
                      <SelectItem value="long-term">Long-term (&gt;1 year)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount & Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="originalAmount">Original Amount *</Label>
                    <Input
                      id="originalAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.originalAmount}
                      onChange={(e) => setFormData({ ...formData, originalAmount: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interestRate">Interest Rate (% p.a.)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Interest Method & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Interest Method *</Label>
                    <Select
                      value={formData.interestMethod}
                      onValueChange={(v) => setFormData({ ...formData, interestMethod: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple Interest</SelectItem>
                        <SelectItem value="compound">Compound / EMI</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {formData.interestMethod === 'simple'
                        ? 'Fixed interest on principal each month'
                        : 'Fixed EMI; interest portion decreases monthly'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationMonths">Duration (months) *</Label>
                    <Input
                      id="durationMonths"
                      type="number"
                      min="1"
                      max="600"
                      value={formData.durationMonths}
                      onChange={(e) => setFormData({ ...formData, durationMonths: parseInt(e.target.value) || 12 })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Used for schedule &amp; P&amp;L calculation</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyPayment">Monthly Payment</Label>
                    <Input
                      id="monthlyPayment"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.monthlyPayment}
                      onChange={(e) => setFormData({ ...formData, monthlyPayment: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Loan Received Method</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">How the loan funds were received</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  />
                </div>

                {/* Live preview of monthly cost */}
                {formData.originalAmount > 0 && formData.interestRate > 0 && formData.durationMonths > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm space-y-1">
                    <p className="font-medium text-muted-foreground">Schedule Preview</p>
                    {formData.interestMethod === 'simple' ? (
                      <>
                        <p>Monthly Interest: <strong>{formatCurrency(formData.originalAmount * formData.interestRate / 100 / 12)}</strong></p>
                        <p>Total Interest: <strong>{formatCurrency(formData.originalAmount * formData.interestRate / 100 / 12 * formData.durationMonths)}</strong></p>
                        <p>Total Repayment: <strong>{formatCurrency(formData.originalAmount + formData.originalAmount * formData.interestRate / 100 / 12 * formData.durationMonths)}</strong></p>
                      </>
                    ) : (() => {
                      const r = formData.interestRate / 100 / 12;
                      const n = formData.durationMonths;
                      const emi = r > 0 ? (formData.originalAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : formData.originalAmount / n;
                      return (
                        <>
                          <p>Monthly EMI: <strong>{formatCurrency(emi)}</strong></p>
                          <p>Total Payment: <strong>{formatCurrency(emi * n)}</strong></p>
                          <p>Total Interest: <strong>{formatCurrency(emi * n - formData.originalAmount)}</strong></p>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingLoan ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Payment Dialog ──────────────────────────────────────────────────── */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment — {selectedLoan?.lenderName}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePayment}>
              <div className="space-y-4 py-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Remaining Balance</p>
                  <p className="text-xl font-bold">{formatCurrency(selectedLoan?.remainingBalance || 0)}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Payment Amount *</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={paymentData.paymentMethod}
                    onValueChange={(value) => setPaymentData({ ...paymentData, paymentMethod: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Record Payment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Equity Dialog ───────────────────────────────────────────────────── */}
        <Dialog open={isEquityDialogOpen} onOpenChange={setIsEquityDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Equity Settings</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateEquity}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="shareCapital">Share Capital *</Label>
                  <Input
                    id="shareCapital"
                    type="number"
                    min="0"
                    step="0.01"
                    value={equityFormData.shareCapital}
                    onChange={(e) => setEquityFormData({ ...equityFormData, shareCapital: parseFloat(e.target.value) })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Initial capital invested by shareholders</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retainedEarnings">Retained Earnings</Label>
                  <Input
                    id="retainedEarnings"
                    type="number"
                    step="0.01"
                    value={equityFormData.retainedEarnings}
                    onChange={(e) => setEquityFormData({ ...equityFormData, retainedEarnings: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Accumulated profits retained in the business</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEquityDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Balance Sheet Manual Entries Dialog ─────────────────────────────── */}
        <Dialog open={isBalanceSheetDialogOpen} onOpenChange={setIsBalanceSheetDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Balance Sheet Manual Entries</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateBalanceSheet}>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg mb-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Current Liabilities</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accruedExpenses">Accrued Expenses</Label>
                  <Input
                    id="accruedExpenses"
                    type="number"
                    min="0"
                    step="0.01"
                    value={balanceSheetFormData.accruedExpenses}
                    onChange={(e) => setBalanceSheetFormData({ ...balanceSheetFormData, accruedExpenses: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Expenses incurred but not yet paid</p>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Other Current Liabilities</Label>
                  {balanceSheetFormData.currentLiabilities.map((liab, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span className="flex-1 text-sm">{liab.name}</span>
                      <span className="text-sm font-medium">{formatCurrency(liab.amount)}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveCurrentLiability(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Name (e.g., Deposit Received)"
                      value={newCurrentLiability.name}
                      onChange={(e) => setNewCurrentLiability({ ...newCurrentLiability, name: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      min="0"
                      step="0.01"
                      value={newCurrentLiability.amount || ''}
                      onChange={(e) => setNewCurrentLiability({ ...newCurrentLiability, amount: parseFloat(e.target.value) || 0 })}
                      className="w-24"
                    />
                    <Button type="button" onClick={handleAddCurrentLiability}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg mb-4 mt-6">
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Non-Current Liabilities</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherLongTermLiabilities">Other Long-term Liabilities</Label>
                  <Input
                    id="otherLongTermLiabilities"
                    type="number"
                    min="0"
                    step="0.01"
                    value={balanceSheetFormData.otherLongTermLiabilities}
                    onChange={(e) => setBalanceSheetFormData({ ...balanceSheetFormData, otherLongTermLiabilities: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Long-term obligations not classified as loans</p>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Custom Non-Current Liabilities</Label>
                  {balanceSheetFormData.nonCurrentLiabilities.map((liab, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span className="flex-1 text-sm">{liab.name}</span>
                      <span className="text-sm font-medium">{formatCurrency(liab.amount)}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveNonCurrentLiability(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Name"
                      value={newNonCurrentLiability.name}
                      onChange={(e) => setNewNonCurrentLiability({ ...newNonCurrentLiability, name: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      min="0"
                      step="0.01"
                      value={newNonCurrentLiability.amount || ''}
                      onChange={(e) => setNewNonCurrentLiability({ ...newNonCurrentLiability, amount: parseFloat(e.target.value) || 0 })}
                      className="w-24"
                    />
                    <Button type="button" onClick={handleAddNonCurrentLiability}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsBalanceSheetDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Loan Schedule Dialog ────────────────────────────────────────────── */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {scheduleLoan?.interestMethod === 'compound'
                  ? '📊 Long-term Loan Amortisation Table'
                  : '📈 Short-term Loan Interest Schedule'}
              </DialogTitle>
              {scheduleLoan && (
                <p className="text-sm text-muted-foreground mt-1">
                  {scheduleLoan.lenderName} &nbsp;·&nbsp; {scheduleLoan.loanNumber}
                </p>
              )}
            </DialogHeader>
            <div className="mt-2">
              {renderSchedule()}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
