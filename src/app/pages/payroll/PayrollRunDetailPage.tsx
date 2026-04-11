import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  payrollRunApi,
  chartOfAccountsApi,
  bankAccountsApi,
  PayrollRun,
  PayrollRunPreview,
  BankAccount,
} from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  RotateCcw,
  FileText,
  DollarSign,
  Users,
  Building2,
  Eye,
  AlertCircle,
  Calendar,
  Info,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { toast } from "sonner";

export default function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<PayrollRun | null>(null);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<PayrollRunPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Post dialog
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reverse dialog
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [reversalReason, setReversalReason] = useState("");

  const [chartAccounts, setChartAccounts] = useState<
    Array<{ _id: string; code: string; name: string; type: string }>
  >([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Available periods (months with finalisedunprocessed records)
  const [availablePeriods, setAvailablePeriods] = useState<
    Array<{
      month: number;
      year: number;
      count: number;
      totalGross: number;
      totalNet: number;
    }>
  >([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<{
    month: number;
    year: number;
  } | null>(null);

  const [createForm, setCreateForm] = useState({
    pay_period_start: "",
    pay_period_end: "",
    payment_date: "",
    period_month: 0,
    period_year: 0,
    salary_account_id: "",
    tax_payable_account_id: "",
    bank_account_id: "",
    other_deductions_account_id: "",
    notes: "",
  });

  useEffect(() => {
    if (id) {
      fetchRun();
    } else {
      setLoading(false);
      fetchAvailablePeriods();
    }
  }, [id]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchAvailablePeriods = async () => {
    setLoadingPeriods(true);
    try {
      const response = await payrollRunApi.getAvailablePeriods();
      if (response.success) {
        setAvailablePeriods(response.data || []);
      }
    } catch (error) {
      console.error(
        "[PayrollRunDetailPage] Failed to fetch available periods:",
        error,
      );
    } finally {
      setLoadingPeriods(false);
    }
  };

  const fetchRun = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await payrollRunApi.getById(id);
      if (response.success) {
        setRun(response.data);
      }
    } catch (error) {
      console.error("[PayrollRunDetailPage] Failed to fetch:", error);
      toast.error(t("payroll.messages.runLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [accountsRes, bankRes] = await Promise.all([
        chartOfAccountsApi.getAll(),
        bankAccountsApi.getAll(),
      ]);
      if (accountsRes.success) setChartAccounts(accountsRes.data || []);
      if (bankRes.success) setBankAccounts(bankRes.data || []);
    } catch (error) {
      console.error(
        "[PayrollRunDetailPage] Failed to fetch dropdown data:",
        error,
      );
    }
  };

  const handlePreview = async () => {
    if (!run) return;
    setPreviewLoading(true);
    try {
      const salaryAccountId =
        typeof run.salary_account_id === "object"
          ? run.salary_account_id._id
          : run.salary_account_id;
      const taxAccountId =
        typeof run.tax_payable_account_id === "object"
          ? run.tax_payable_account_id._id
          : run.tax_payable_account_id;
      const bankAccountId =
        typeof run.bank_account_id === "object"
          ? run.bank_account_id._id
          : run.bank_account_id;
      const otherDedId = run.other_deductions_account_id
        ? typeof run.other_deductions_account_id === "object"
          ? run.other_deductions_account_id._id
          : run.other_deductions_account_id
        : undefined;

      const response = await payrollRunApi.preview({
        pay_period_start: run.pay_period_start,
        pay_period_end: run.pay_period_end,
        salary_account_id: salaryAccountId,
        tax_payable_account_id: taxAccountId,
        bank_account_id: bankAccountId,
        other_deductions_account_id: otherDedId,
      });
      if (response.success) {
        setPreview(response.data);
        setShowPreview(true);
      }
    } catch (error: any) {
      toast.error(error?.message || t("payroll.messages.previewFailed"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePost = async () => {
    if (!run) return;
    setSubmitting(true);
    try {
      const response = await payrollRunApi.post(run._id);
      if (response.success) {
        toast.success(t("payroll.messages.runPosted"));
        setShowPostDialog(false);
        fetchRun();
      }
    } catch (error: any) {
      toast.error(error?.message || t("payroll.messages.runPostFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverse = async () => {
    if (!run) return;
    setSubmitting(true);
    try {
      const response = await payrollRunApi.reverse(run._id, {
        reason: reversalReason || undefined,
      });
      if (response.success) {
        toast.success(t("payroll.messages.runReversed"));
        setShowReverseDialog(false);
        setReversalReason("");
        fetchRun();
      }
    } catch (error: any) {
      toast.error(error?.message || t("payroll.messages.runReverseFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectPeriod = (month: number, year: number) => {
    setSelectedPeriod({ month, year });
    // Auto-fill pay period dates to cover the full calendar month
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0); // day 0 of next month = last day of this month
    const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    // Default payment date: 5th of the following month (common payroll practice)
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const paymentDateStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-05`;
    setCreateForm((prev) => ({
      ...prev,
      pay_period_start: firstDay,
      pay_period_end: lastDayStr,
      payment_date: paymentDateStr,
      period_month: month,
      period_year: year,
    }));
  };

  const handleCreateFromRecords = async () => {
    if (!selectedPeriod) {
      toast.error("Please select a payroll period first");
      return;
    }
    if (
      !createForm.payment_date ||
      !createForm.salary_account_id ||
      !createForm.tax_payable_account_id ||
      !createForm.bank_account_id
    ) {
      toast.error(
        "Please fill in all required fields (Payment Date, Bank Account, Salary Account, Tax Account)",
      );
      return;
    }
    setSubmitting(true);
    try {
      const response = await payrollRunApi.createFromRecords({
        pay_period_start: createForm.pay_period_start,
        pay_period_end: createForm.pay_period_end,
        payment_date: createForm.payment_date,
        period_month: selectedPeriod.month,
        period_year: selectedPeriod.year,
        salary_account_id: createForm.salary_account_id,
        tax_payable_account_id: createForm.tax_payable_account_id,
        bank_account_id: createForm.bank_account_id,
        other_deductions_account_id:
          createForm.other_deductions_account_id || undefined,
        notes: createForm.notes || undefined,
      });
      if (response.success) {
        toast.success(
          t("payroll.messages.runCreated") ||
            "Payroll run created successfully",
        );
        navigate(`/payroll-runs/${response.data._id}`);
      }
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("NO_FINALISED_RECORDS")) {
        toast.error(
          "No finalised payroll records found for this period. Please go to Payroll and finalise employee records first.",
        );
      } else if (msg.includes("PAYROLL_TOTALS_MISMATCH")) {
        toast.error(
          "Payroll totals do not balance. Please review the payroll records for this period.",
        );
      } else {
        toast.error(
          msg ||
            t("payroll.messages.runLoadFailed") ||
            "Failed to create payroll run",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string }> = {
      draft: { className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500" },
      posted: { className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700" },
      reversed: { className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700" },
    };
    const { className } = config[status] || config.draft;
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    );
  };

  const getAccountLabel = (account: any) => {
    if (!account) return "-";
    if (typeof account === "object")
      return `${account.code || ""} - ${account.name || ""}`;
    return account;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // ── Create-from-records page (no id means new payroll run) ─────────────────────────────
  if (!id) {
    const selectedPeriodData = selectedPeriod
      ? availablePeriods.find(
          (p) =>
            p.month === selectedPeriod.month && p.year === selectedPeriod.year,
        )
      : null;

    return (
      <Layout>
        <div className="container mx-auto py-6 space-y-6 max-w-3xl bg-gray-50 dark:bg-slate-900 min-h-screen">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/payroll-runs")}
              className="dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold dark:text-white">Create Payroll Run</h1>
              <p className="text-sm text-muted-foreground dark:text-slate-400">
                Process finalised employee records into a payroll run
              </p>
            </div>
          </div>

          {/* Step 1 — Select Payroll Period */}
          <Card className="dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base dark:text-white">
                <Calendar className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                Step 1 — Select Payroll Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPeriods ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading available periods…
                </div>
              ) : availablePeriods.length === 0 ? (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300">
                      No finalised payroll records found
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      Before creating a payroll run, go to the{" "}
                      <button
                        className="underline font-medium"
                        onClick={() => navigate("/payroll")}
                      >
                        Payroll page
                      </button>{" "}
                      and finalise at least one employee payroll record.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {availablePeriods.length} period
                    {availablePeriods.length !== 1 ? "s" : ""} with unprocessed
                    finalised records:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availablePeriods.map((p) => {
                      const isSelected =
                        selectedPeriod?.month === p.month &&
                        selectedPeriod?.year === p.year;
                      return (
                        <button
                          key={`${p.year}-${p.month}`}
                          onClick={() => handleSelectPeriod(p.month, p.year)}
                          className={`text-left p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                              : "border-border hover:border-indigo-300 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {MONTH_NAMES[p.month - 1]} {p.year}
                            </span>
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-indigo-500" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {p.count} employee{p.count !== 1 ? "s" : ""}{" "}
                            &nbsp;·&nbsp; Gross {formatCurrency(p.totalGross)}
                          </div>
                          <div className="text-sm font-medium text-green-600 dark:text-green-400 mt-0.5">
                            Net {formatCurrency(p.totalNet)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2 — Configure Run (shown only after period is selected) */}
          {selectedPeriod && (
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base dark:text-white">
                  <DollarSign className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                  Step 2 — Configure Run for{" "}
                  {MONTH_NAMES[selectedPeriod.month - 1]} {selectedPeriod.year}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Selected period summary */}
                {selectedPeriodData && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 text-sm">
                    <Info className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <span className="text-indigo-800 dark:text-indigo-300">
                      Will process <strong>{selectedPeriodData.count}</strong>{" "}
                      employee record{selectedPeriodData.count !== 1 ? "s" : ""}{" "}
                      &nbsp;·&nbsp; Gross{" "}
                      <strong>
                        {formatCurrency(selectedPeriodData.totalGross)}
                      </strong>{" "}
                      &nbsp;·&nbsp; Net{" "}
                      <strong>
                        {formatCurrency(selectedPeriodData.totalNet)}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Pay Period Start</Label>
                    <Input
                      type="date"
                      value={createForm.pay_period_start}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          pay_period_start: e.target.value,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Pay Period End</Label>
                    <Input
                      type="date"
                      value={createForm.pay_period_end}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          pay_period_end: e.target.value,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Payment Date *</Label>
                    <Input
                      type="date"
                      value={createForm.payment_date}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          payment_date: e.target.value,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      Date salaries are disbursed
                    </p>
                  </div>
                </div>

                {/* Accounts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Bank Account (Net Pay) *</Label>
                    <Select
                      value={createForm.bank_account_id}
                      onValueChange={(v) =>
                        setCreateForm({ ...createForm, bank_account_id: v })
                      }
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Select bank account…" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {bankAccounts.map((ba) => (
                          <SelectItem key={ba._id} value={ba._id} className="dark:text-slate-200">
                            {ba.name}
                            {ba.bankName ? ` — ${ba.bankName}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      Account to debit for net salaries
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Salary Expense Account *</Label>
                    <Select
                      value={createForm.salary_account_id}
                      onValueChange={(v) =>
                        setCreateForm({ ...createForm, salary_account_id: v })
                      }
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Select salary account…" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {chartAccounts
                          .filter((a) => a.type === "expense")
                          .map((a) => (
                            <SelectItem key={a._id} value={a._id} className="dark:text-slate-200">
                              {a.code} — {a.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      e.g. 5400 Salaries & Wages
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">PAYE Tax Payable Account *</Label>
                    <Select
                      value={createForm.tax_payable_account_id}
                      onValueChange={(v) =>
                        setCreateForm({
                          ...createForm,
                          tax_payable_account_id: v,
                        })
                      }
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Select PAYE account…" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {chartAccounts
                          .filter((a) => a.type === "liability")
                          .map((a) => (
                            <SelectItem key={a._id} value={a._id} className="dark:text-slate-200">
                              {a.code} — {a.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      e.g. 2230 PAYE Tax Payable
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">RSSB Deductions Account</Label>
                    <Select
                      value={createForm.other_deductions_account_id}
                      onValueChange={(v) =>
                        setCreateForm({
                          ...createForm,
                          other_deductions_account_id: v === "_none_" ? "" : v,
                        })
                      }
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Select RSSB account (optional)…" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="_none_" className="dark:text-slate-200">— None —</SelectItem>
                        {chartAccounts
                          .filter((a) => a.type === "liability")
                          .map((a) => (
                            <SelectItem key={a._id} value={a._id} className="dark:text-slate-200">
                              {a.code} — {a.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      e.g. 2240 RSSB Payable
                    </p>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <Label className="dark:text-slate-200">Notes (optional)</Label>
                  <Input
                    value={createForm.notes}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, notes: e.target.value })
                    }
                    placeholder="e.g. April 2026 salary run"
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/payroll-runs")}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateFromRecords}
                    disabled={
                      submitting ||
                      !createForm.bank_account_id ||
                      !createForm.salary_account_id ||
                      !createForm.tax_payable_account_id ||
                      !createForm.payment_date
                    }
                  >
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Payroll Run for{" "}
                    {MONTH_NAMES[selectedPeriod.month - 1]}{" "}
                    {selectedPeriod.year}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    );
  }

  if (!run) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex flex-col items-center py-12">
            <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Payroll run not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/payroll-runs")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payroll Runs
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/payroll-runs")} className="dark:text-slate-300 dark:hover:bg-slate-700">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono dark:text-white">
                  {run.reference_no}
                </h1>
                {getStatusBadge(run.status)}
              </div>
              <p className="text-sm text-muted-foreground dark:text-slate-400">
                {formatDate(run.pay_period_start)} -{" "}
                {formatDate(run.pay_period_end)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {run.status === "draft" && (
              <>
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={previewLoading}
                >
                  {previewLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  {t("payroll.run.previewJournal")}
                </Button>
                <Button onClick={() => setShowPostDialog(true)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t("payroll.run.postRun")}
                </Button>
              </>
            )}
            {run.status === "posted" && (
              <Button
                variant="outline"
                onClick={() => setShowReverseDialog(true)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("payroll.run.reverseRun")}
              </Button>
            )}
          </div>
        </div>

        {/* Aggregated Totals */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 dark:text-slate-200">
                <Users className="h-4 w-4 text-muted-foreground dark:text-slate-400" />{" "}
                {t("payroll.employees")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{run.employee_count}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 dark:text-slate-200">
                <DollarSign className="h-4 w-4 text-muted-foreground dark:text-slate-400" />{" "}
                {t("payroll.totalGross")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">
                {formatCurrency(run.total_gross)}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
                {t("payroll.totalPAYE")} + RSSB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(run.total_tax + run.total_other_deductions)}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
                {t("payroll.totalNet")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(run.total_net)}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-200">
                {t("payroll.paymentDate")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold dark:text-white">
                {formatDate(run.payment_date)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account References */}
        <Card className="dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2 dark:text-white">
              <Building2 className="h-4 w-4" /> Account References
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground dark:text-slate-400">Bank Account</p>
                <p className="font-medium dark:text-white">
                  {getAccountLabel(run.bank_account_id)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground dark:text-slate-400">Salary Expense</p>
                <p className="font-medium dark:text-white">
                  {getAccountLabel(run.salary_account_id)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground dark:text-slate-400">Tax Payable</p>
                <p className="font-medium dark:text-white">
                  {getAccountLabel(run.tax_payable_account_id)}
                </p>
              </div>
              {run.other_deductions_account_id && (
                <div>
                  <p className="text-xs text-muted-foreground dark:text-slate-400">
                    Other Deductions
                  </p>
                  <p className="font-medium dark:text-white">
                    {getAccountLabel(run.other_deductions_account_id)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Linked Journal Entry */}
        {run.journal_entry_id && (
          <Card className="dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2 dark:text-white">
                <FileText className="h-4 w-4" />{" "}
                {t("payroll.run.linkedJournalEntry")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground dark:text-slate-400">
                    {t("payroll.run.entryNumber")}
                  </p>
                  <p className="font-mono font-bold dark:text-white">
                    {typeof run.journal_entry_id === "object"
                      ? (run.journal_entry_id as any).entryNumber
                      : run.journal_entry_id}
                  </p>
                </div>
                {run.posted_by && (
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Posted By</p>
                    <p className="font-medium dark:text-white">
                      {typeof run.posted_by === "object"
                        ? (run.posted_by as any).name
                        : run.posted_by}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee Lines */}
        <Card className="dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2 dark:text-white">
              <Users className="h-4 w-4" /> {t("payroll.run.employeeLines")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                  <TableHead className="dark:text-slate-200">{t("payroll.employeeName")}</TableHead>
                  <TableHead className="dark:text-slate-200">{t("payroll.employeeId")}</TableHead>
                  <TableHead className="text-right dark:text-slate-200">
                    {t("payroll.grossSalary")}
                  </TableHead>
                  <TableHead className="text-right dark:text-slate-200">
                    {t("payroll.paye")}
                  </TableHead>
                  <TableHead className="text-right dark:text-slate-200">
                    {t("payroll.rssbEmployee")}
                  </TableHead>
                  <TableHead className="text-right dark:text-slate-200">
                    {t("payroll.rssbEmployer")}
                  </TableHead>
                  <TableHead className="text-right dark:text-slate-200">
                    {t("payroll.netPay")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.lines.map((line, index) => (
                  <TableRow key={index} className="dark:border-slate-600">
                    <TableCell className="font-medium dark:text-white">
                      {line.employee_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground dark:text-slate-400">
                      {line.employee_id}
                    </TableCell>
                    <TableCell className="text-right dark:text-slate-200">
                      {formatCurrency(line.gross_salary)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      {formatCurrency(line.tax_deduction)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 dark:text-orange-400">
                      {formatCurrency(line.other_deductions)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 dark:text-blue-400">
                      {formatCurrency(line.rssb_employer)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(line.net_pay)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-bold dark:bg-slate-700/50">
                  <TableCell colSpan={2} className="dark:text-white">TOTAL</TableCell>
                  <TableCell className="text-right dark:text-white">
                    {formatCurrency(run.total_gross)}
                  </TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400">
                    {formatCurrency(run.total_tax)}
                  </TableCell>
                  <TableCell className="text-right text-orange-600 dark:text-orange-400">
                    {formatCurrency(run.total_other_deductions)}
                  </TableCell>
                  <TableCell className="text-right text-blue-600 dark:text-blue-400">
                    {formatCurrency(
                      run.lines.reduce((s, l) => s + (l.rssb_employer || 0), 0),
                    )}
                  </TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400">
                    {formatCurrency(run.total_net)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Notes */}
        {run.notes && (
          <Card className="dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium dark:text-white">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground dark:text-slate-400">{run.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Journal Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("payroll.run.journalPreview")}</DialogTitle>
              <DialogDescription>
                Preview of journal entry that will be created when posting.
              </DialogDescription>
            </DialogHeader>
            {preview && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Employees</p>
                    <p className="font-bold">{preview.employeeCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Debit</p>
                    <p className="font-bold">
                      {formatCurrency(
                        preview.lines.reduce((s, l) => s + l.debit, 0),
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Credit</p>
                    <p className="font-bold">
                      {formatCurrency(
                        preview.lines.reduce((s, l) => s + l.credit, 0),
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={preview.isBalanced ? "default" : "destructive"}
                    className={preview.isBalanced ? "bg-green-500" : ""}
                  >
                    {preview.isBalanced
                      ? t("payroll.run.balanced")
                      : t("payroll.run.notBalanced")}
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("payroll.run.accountCode")}</TableHead>
                      <TableHead>{t("payroll.run.accountName")}</TableHead>
                      <TableHead>{t("payroll.run.description")}</TableHead>
                      <TableHead className="text-right">
                        {t("payroll.run.debit")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("payroll.run.credit")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.lines.map((line, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">
                          {line.accountCode}
                        </TableCell>
                        <TableCell>{line.accountName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {line.description}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          preview.lines.reduce((s, l) => s + l.debit, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          preview.lines.reduce((s, l) => s + l.credit, 0),
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                {t("common.close")}
              </Button>
              {run.status === "draft" && (
                <Button
                  onClick={() => {
                    setShowPreview(false);
                    setShowPostDialog(true);
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t("payroll.run.postRun")}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Post Confirmation Dialog */}
        <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("payroll.run.postConfirmTitle")}</DialogTitle>
              <DialogDescription>
                {t("payroll.run.postConfirmMessage")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPostDialog(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={handlePost} disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("payroll.run.postRun")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reverse Confirmation Dialog */}
        <Dialog open={showReverseDialog} onOpenChange={setShowReverseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("payroll.run.reverseConfirmTitle")}</DialogTitle>
              <DialogDescription>
                {t("payroll.run.reverseConfirmMessage")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1">
                <Label>{t("payroll.run.reversalReason")}</Label>
                <Input
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Enter reason for reversal..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowReverseDialog(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReverse}
                disabled={submitting}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("payroll.run.reverseRun")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
