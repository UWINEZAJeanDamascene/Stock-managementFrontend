import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { pettyCashApi, bankAccountsApi, chartOfAccountsApi } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Plus,
  Eye,
  RefreshCw,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Search,
  Pencil,
  RotateCcw,
  Info,
  Calculator,
  ClipboardCheck,
  Scale,
  ArrowUpCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
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
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function PettyCashListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // ── Dialog visibility ────────────────────────────────────────────────────────
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showReplenishDialog, setShowReplenishDialog] = useState(false);
  const [showCashCountDialog, setShowCashCountDialog] = useState(false);
  const [showReconciliationsDialog, setShowReconciliationsDialog] = useState(false);
  const [showImprestDialog, setShowImprestDialog] = useState(false);

  // ── Selected fund for dialogs ────────────────────────────────────────────────
  const [selectedFund, setSelectedFund] = useState<any | null>(null);

  // ── Create Fund form (no custodianId — backend defaults to req.user) ─────────
  const [newFundForm, setNewFundForm] = useState({
    name: "",
    floatAmount: 0,
    openingBalance: 0,
    imprestMode: true,
    notes: "",
  });

  // ── Edit Fund form ────────────────────────────────────────────────────────────
  const [editFundForm, setEditFundForm] = useState({
    name: "",
    floatAmount: 0,
    notes: "",
  });

  // ── Top-Up form ───────────────────────────────────────────────────────────────
  const [topUpForm, setTopUpForm] = useState({
    amount: 0,
    bank_account_id: "",
    description: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });

  // ── Record Expense form ───────────────────────────────────────────────────────
  const [expenseForm, setExpenseForm] = useState({
    amount: 0,
    expenseAccountId: "",
    description: "",
    receiptRef: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });

  // ── Replenishment form ────────────────────────────────────────────────────────
  const [replenishForm, setReplenishForm] = useState({
    amount: 0,
    reason: "",
    bank_account_id: "",
  });

  // ── Cash Count form ───────────────────────────────────────────────────────────
  const [cashCountForm, setCashCountForm] = useState({
    countDate: new Date().toISOString().split("T")[0],
    denominations: [
      { denomination: 1000, count: 0, total: 0 },
      { denomination: 500, count: 0, total: 0 },
      { denomination: 200, count: 0, total: 0 },
      { denomination: 100, count: 0, total: 0 },
      { denomination: 50, count: 0, total: 0 },
      { denomination: 20, count: 0, total: 0 },
      { denomination: 10, count: 0, total: 0 },
      { denomination: 5, count: 0, total: 0 },
      { denomination: 1, count: 0, total: 0 },
      { denomination: 0.5, count: 0, total: 0 },
      { denomination: 0.25, count: 0, total: 0 },
    ],
    notes: "",
  });

  // ── Reconciliations list ───────────────────────────────────────────────────────
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [loadingReconciliations, setLoadingReconciliations] = useState(false);

  // ── Replenishments list ────────────────────────────────────────────────────────
  const [showReplenishmentsDialog, setShowReplenishmentsDialog] = useState(false);
  const [replenishments, setReplenishments] = useState<any[]>([]);
  const [loadingReplenishments, setLoadingReplenishments] = useState(false);
  const [selectedReplenishment, setSelectedReplenishment] = useState<any | null>(null);
  const [showReplenishmentCompleteDialog, setShowReplenishmentCompleteDialog] = useState(false);
  const [replenishmentCompleteForm, setReplenishmentCompleteForm] = useState({
    actualAmount: 0,
    notes: "",
  });

  // ── Reconciliation Approval dialog ───────────────────────────────────────────────
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState<any | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    status: "approved" as "approved" | "rejected",
    discrepancyExplanation: "",
  });

  // ── Imprest calculation ────────────────────────────────────────────────────────
  const [imprestCalculation, setImprestCalculation] = useState<any>(null);

  // ── Data fetchers ─────────────────────────────────────────────────────────────

  const fetchFunds = useCallback(
    async (overrideShowInactive?: boolean) => {
      setLoading(true);
      try {
        const inactive =
          overrideShowInactive !== undefined
            ? overrideShowInactive
            : showInactive;
        // When showing inactive, pass no isActive filter to get all funds.
        const params = inactive ? {} : { isActive: true };
        const response = await pettyCashApi.getFunds(params);
        console.log("[PettyCashListPage] Funds API Response:", response);
        if (response.success && response.data) {
          setFunds(response.data);
        }
      } catch (error) {
        console.error("[PettyCashListPage] Failed to fetch funds:", error);
        toast.error("Failed to load funds");
      } finally {
        setLoading(false);
      }
    },
    [showInactive],
  );

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      if (response.success) {
        setBankAccounts(response.data);
      }
    } catch (error) {
      console.error(
        "[PettyCashListPage] Failed to fetch bank accounts:",
        error,
      );
    }
  }, []);

  const fetchExpenseAccounts = useCallback(async () => {
    try {
      const response = await chartOfAccountsApi.getAll({
        type: "expense",
        isActive: true,
      });
      if (response.success && response.data && response.data.length > 0) {
        setExpenseAccounts(response.data);
        // Pre-select first available account
        setExpenseForm((prev) => ({
          ...prev,
          expenseAccountId: prev.expenseAccountId || response.data[0].code,
        }));
      }
    } catch (error) {
      // Non-fatal — fall back to hardcoded list
      console.warn(
        "[PettyCashListPage] Could not load expense accounts, using defaults:",
        error,
      );
    }
  }, []);

  useEffect(() => {
    fetchFunds();
    fetchBankAccounts();
    fetchExpenseAccounts();
  }, [fetchFunds, fetchBankAccounts, fetchExpenseAccounts]);

  // ── Toggle inactive handler ───────────────────────────────────────────────────
  const handleToggleInactive = (checked: boolean) => {
    setShowInactive(checked);
    fetchFunds(checked);
  };

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filteredFunds = funds.filter(
    (fund) =>
      fund.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fund.custodian?.name &&
        fund.custodian.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleCreateFund = async () => {
    if (!newFundForm.name || newFundForm.floatAmount <= 0) {
      toast.error(
        "Please provide a fund name and a float amount greater than 0",
      );
      return;
    }
    setSubmitting(true);
    try {
      const response = await pettyCashApi.createFund({
        name: newFundForm.name,
        floatAmount: newFundForm.floatAmount,
        openingBalance: newFundForm.openingBalance || undefined,
        imprestMode: newFundForm.imprestMode,
        notes: newFundForm.notes || undefined,
      });
      if (response.success) {
        toast.success("Petty cash fund created successfully");
        setShowCreateDialog(false);
        setNewFundForm({
          name: "",
          floatAmount: 0,
          openingBalance: 0,
          imprestMode: true,
          notes: "",
        });
        fetchFunds();
      } else {
        toast.error("Failed to create fund");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Create fund error:", error);
      toast.error(error.response?.data?.message || "Failed to create fund");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditFund = async () => {
    if (!editFundForm.name || editFundForm.floatAmount <= 0) {
      toast.error(
        "Please provide a fund name and a float amount greater than 0",
      );
      return;
    }
    setSubmitting(true);
    try {
      // updateFloat maps to PUT /petty-cash/floats/:id
      const response = await pettyCashApi.updateFloat(selectedFund?._id!, {
        name: editFundForm.name,
        notes: editFundForm.notes || undefined,
      });
      if (response.success) {
        toast.success("Fund updated successfully");
        setShowEditDialog(false);
        fetchFunds();
      } else {
        toast.error("Failed to update fund");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Edit fund error:", error);
      toast.error(error.response?.data?.message || "Failed to update fund");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopUp = async () => {
    if (!topUpForm.amount || topUpForm.amount <= 0) {
      toast.error("Please provide a valid amount");
      return;
    }
    if (!topUpForm.bank_account_id) {
      toast.error("Please select a bank account");
      return;
    }
    setSubmitting(true);
    try {
      const response = await pettyCashApi.topUp(selectedFund?._id!, {
        amount: topUpForm.amount,
        bank_account_id: topUpForm.bank_account_id,
        description: topUpForm.description || undefined,
        transactionDate: topUpForm.transactionDate,
      });
      if (response.success) {
        toast.success("Top-up successful");
        setShowTopUpDialog(false);
        setTopUpForm({
          amount: 0,
          bank_account_id: "",
          description: "",
          transactionDate: new Date().toISOString().split("T")[0],
        });
        fetchFunds();
        fetchBankAccounts();
      } else {
        toast.error("Failed to process top-up");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Top-up error:", error);
      toast.error(error.response?.data?.message || "Failed to process top-up");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordExpense = async () => {
    if (!expenseForm.amount || expenseForm.amount <= 0) {
      toast.error("Please provide a valid expense amount");
      return;
    }
    if (!expenseForm.expenseAccountId) {
      toast.error("Please select an expense account");
      return;
    }
    setSubmitting(true);
    try {
      const response = await pettyCashApi.recordExpense(selectedFund?._id!, {
        amount: expenseForm.amount,
        expenseAccountId: expenseForm.expenseAccountId,
        description: expenseForm.description || undefined,
        receiptRef: expenseForm.receiptRef || undefined,
        transactionDate: expenseForm.transactionDate,
      });
      if (response.success) {
        toast.success("Expense recorded successfully");
        setShowExpenseDialog(false);
        const defaultCode =
          expenseAccounts.length > 0
            ? expenseAccounts[0].code
            : FALLBACK_ACCOUNTS[0].code;
        setExpenseForm({
          amount: 0,
          expenseAccountId: defaultCode,
          description: "",
          receiptRef: "",
          transactionDate: new Date().toISOString().split("T")[0],
        });
        fetchFunds();
      } else {
        toast.error("Failed to record expense");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Record expense error:", error);
      toast.error(error.response?.data?.message || "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplenishment = async () => {
    if (!replenishForm.amount || replenishForm.amount <= 0) {
      toast.error("Please provide a valid replenishment amount");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        float: selectedFund?._id!,
        amount: replenishForm.amount,
        reason: replenishForm.reason || undefined,
      };
      if (replenishForm.bank_account_id) {
        payload.bank_account_id = replenishForm.bank_account_id;
      }
      // Create replenishment request
      const response = await pettyCashApi.createReplenishment(payload);
      if (response.success && response.data?._id) {
        const replenishmentId = response.data._id;

        // Auto-approve the replenishment
        await pettyCashApi.approveReplenishment(replenishmentId, {
          status: "approved",
          notes: "Auto-approved for imprest replenishment",
        });

        // Auto-complete the replenishment (this creates the transaction)
        await pettyCashApi.completeReplenishment(replenishmentId, {
          actualAmount: replenishForm.amount,
          notes: "Auto-completed for imprest replenishment",
        });

        toast.success("Replenishment completed successfully");
        setShowReplenishDialog(false);
        setReplenishForm({ amount: 0, reason: "", bank_account_id: "" });
        fetchFunds();
      } else {
        toast.error("Failed to create replenishment");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Replenishment error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to process replenishment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Dialog openers ────────────────────────────────────────────────────────────

  const openTopUpDialog = (fund: any) => {
    setSelectedFund(fund);
    setShowTopUpDialog(true);
  };

  const openExpenseDialog = (fund: any) => {
    setSelectedFund(fund);
    setShowExpenseDialog(true);
  };

  const openEditDialog = (fund: any) => {
    setSelectedFund(fund);
    setEditFundForm({
      name: fund.name ?? "",
      floatAmount: fund.floatAmount ?? fund.currentBalance ?? 0,
      notes: fund.notes ?? "",
    });
    setShowEditDialog(true);
  };

  const openReplenishDialog = (fund: any) => {
    setSelectedFund(fund);
    setReplenishForm({ amount: 0, reason: "", bank_account_id: "" });
    setShowReplenishDialog(true);
  };

  const viewTransactions = (fund: any) => {
    navigate(`/petty-cash/${fund._id}/transactions`);
  };

  // ── Cash Count handlers ───────────────────────────────────────────────────────

  const openCashCountDialog = (fund: any) => {
    setSelectedFund(fund);
    setCashCountForm({
      countDate: new Date().toISOString().split("T")[0],
      denominations: [
        { denomination: 1000, count: 0, total: 0 },
        { denomination: 500, count: 0, total: 0 },
        { denomination: 200, count: 0, total: 0 },
        { denomination: 100, count: 0, total: 0 },
        { denomination: 50, count: 0, total: 0 },
        { denomination: 20, count: 0, total: 0 },
        { denomination: 10, count: 0, total: 0 },
        { denomination: 5, count: 0, total: 0 },
        { denomination: 1, count: 0, total: 0 },
        { denomination: 0.5, count: 0, total: 0 },
        { denomination: 0.25, count: 0, total: 0 },
      ],
      notes: "",
    });
    setShowCashCountDialog(true);
  };

  const handleDenominationChange = (index: number, count: number) => {
    setCashCountForm((prev) => {
      const newDenominations = [...prev.denominations];
      newDenominations[index] = {
        ...newDenominations[index],
        count: count || 0,
        total: (count || 0) * newDenominations[index].denomination,
      };
      return { ...prev, denominations: newDenominations };
    });
  };

  const calculatePhysicalTotal = () => {
    return cashCountForm.denominations.reduce((sum, d) => sum + d.total, 0);
  };

  const handleSubmitCashCount = async () => {
    if (!selectedFund) return;
    setSubmitting(true);
    try {
      const physicalTotal = calculatePhysicalTotal();
      const cashDenominations = cashCountForm.denominations.filter(d => d.count > 0);

      const response = await pettyCashApi.createCashCount(selectedFund._id, {
        countDate: cashCountForm.countDate,
        cashDenominations,
        notes: cashCountForm.notes,
      });

      if (response.success) {
        const diff = response.data.difference;
        const diffType = response.data.differenceType;
        let message = `Cash count recorded: ${formatCurrency(physicalTotal)} physical cash`;
        if (diffType === "shortage") {
          message += `. Shortage of ${formatCurrency(Math.abs(diff))}`;
        } else if (diffType === "overage") {
          message += `. Overage of ${formatCurrency(diff)}`;
        } else {
          message += ". Balanced!";
        }
        toast.success(message);
        setShowCashCountDialog(false);
      } else {
        toast.error("Failed to record cash count");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Cash count error:", error);
      toast.error(error.response?.data?.message || "Failed to record cash count");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reconciliations handlers ──────────────────────────────────────────────────

  const openReconciliationsDialog = async (fund: any) => {
    setSelectedFund(fund);
    setShowReconciliationsDialog(true);
    setLoadingReconciliations(true);
    try {
      const response = await pettyCashApi.getReconciliations(fund._id, { limit: 10 });
      if (response.success) {
        setReconciliations(response.data);
      }
    } catch (error) {
      console.error("[PettyCashListPage] Failed to fetch reconciliations:", error);
      toast.error("Failed to load reconciliations");
    } finally {
      setLoadingReconciliations(false);
    }
  };

  const openApproveDialog = (reconciliation: any) => {
    setSelectedReconciliation(reconciliation);
    setApprovalForm({
      status: "approved",
      discrepancyExplanation: "",
    });
    setShowApproveDialog(true);
  };

  const handleApproveReconciliation = async () => {
    if (!selectedReconciliation) return;
    setSubmitting(true);
    try {
      const response = await pettyCashApi.approveReconciliation(
        selectedReconciliation._id,
        {
          status: approvalForm.status,
          discrepancyExplanation: approvalForm.discrepancyExplanation || undefined,
        }
      );
      if (response.success) {
        toast.success(`Reconciliation ${approvalForm.status} successfully`);
        setShowApproveDialog(false);
        // Refresh reconciliations list
        if (selectedFund) {
          const recsResponse = await pettyCashApi.getReconciliations(selectedFund._id, { limit: 10 });
          if (recsResponse.success) {
            setReconciliations(recsResponse.data);
          }
        }
      } else {
        toast.error("Failed to update reconciliation");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Approve reconciliation error:", error);
      toast.error(error.response?.data?.message || "Failed to update reconciliation");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Replenishments handlers ───────────────────────────────────────────────────

  const openReplenishmentsDialog = async (fund: any) => {
    setSelectedFund(fund);
    setShowReplenishmentsDialog(true);
    setLoadingReplenishments(true);
    try {
      const response = await pettyCashApi.getReplenishments(fund._id);
      if (response.success) {
        setReplenishments(response.data);
      }
    } catch (error) {
      console.error("[PettyCashListPage] Failed to fetch replenishments:", error);
      toast.error("Failed to load replenishments");
    } finally {
      setLoadingReplenishments(false);
    }
  };

  const handleApproveReplenishment = async (replenishment: any, status: "approved" | "rejected") => {
    setSubmitting(true);
    try {
      const response = await pettyCashApi.approveReplenishment(replenishment._id, {
        status,
        notes: status === "approved" ? "Approved for replenishment" : "Replenishment rejected",
      });
      if (response.success) {
        toast.success(`Replenishment ${status} successfully`);
        // Refresh list
        if (selectedFund) {
          const resp = await pettyCashApi.getReplenishments(selectedFund._id);
          if (resp.success) setReplenishments(resp.data);
        }
      } else {
        toast.error("Failed to update replenishment");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Approve replenishment error:", error);
      toast.error(error.response?.data?.message || "Failed to update replenishment");
    } finally {
      setSubmitting(false);
    }
  };

  const openCompleteReplenishmentDialog = (replenishment: any) => {
    setSelectedReplenishment(replenishment);
    setReplenishmentCompleteForm({
      actualAmount: replenishment.amount,
      notes: "",
    });
    setShowReplenishmentCompleteDialog(true);
  };

  const handleCompleteReplenishment = async () => {
    if (!selectedReplenishment) return;
    setSubmitting(true);
    try {
      const response = await pettyCashApi.completeReplenishment(selectedReplenishment._id, {
        actualAmount: replenishmentCompleteForm.actualAmount,
        notes: replenishmentCompleteForm.notes || "Replenishment completed",
      });
      if (response.success) {
        toast.success("Replenishment completed successfully");
        setShowReplenishmentCompleteDialog(false);
        // Refresh list and funds
        if (selectedFund) {
          const resp = await pettyCashApi.getReplenishments(selectedFund._id);
          if (resp.success) setReplenishments(resp.data);
          fetchFunds();
        }
      } else {
        toast.error("Failed to complete replenishment");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Complete replenishment error:", error);
      toast.error(error.response?.data?.message || "Failed to complete replenishment");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Imprest handlers ──────────────────────────────────────────────────────────

  const openImprestDialog = async (fund: any) => {
    setSelectedFund(fund);
    setShowImprestDialog(true);
    setImprestCalculation(null);
    try {
      const response = await pettyCashApi.getImprestCalculation(fund._id);
      if (response.success) {
        setImprestCalculation(response.data);
      }
    } catch (error) {
      console.error("[PettyCashListPage] Failed to fetch imprest calculation:", error);
      toast.error("Failed to load imprest calculation");
    }
  };

  // ── Formatters ────────────────────────────────────────────────────────────────

  const formatCurrency = (amount: any, currency = "USD") => {
    let numAmount = 0;
    if (amount !== null && amount !== undefined && amount !== "") {
      if (typeof amount === "object") {
        if (amount.$numberDecimal) {
          numAmount = parseFloat(amount.$numberDecimal);
        } else if (typeof amount.toString === "function") {
          numAmount = parseFloat(amount.toString());
        }
      } else if (typeof amount === "string") {
        numAmount = parseFloat(amount);
      } else {
        numAmount = Number(amount);
      }
    }
    if (isNaN(numAmount)) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // ── Expense account list (dynamic with fallback) ──────────────────────────────

  const FALLBACK_ACCOUNTS = [
    { code: "5100", name: "Operating Expenses" },
    { code: "5200", name: "Administrative Expenses" },
    { code: "5300", name: "Marketing Expenses" },
    { code: "5400", name: "Travel & Entertainment" },
    { code: "5500", name: "Utilities" },
    { code: "5600", name: "Office Supplies" },
    { code: "5700", name: "Repairs & Maintenance" },
    { code: "5800", name: "Communication Expenses" },
    { code: "5900", name: "Miscellaneous Expenses" },
  ];

  const activeExpenseAccounts: { code: string; name: string }[] =
    expenseAccounts.length > 0 ? expenseAccounts : FALLBACK_ACCOUNTS;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen p-6">
        {/* ── Header ── */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 dark:text-white">
              <Wallet className="h-8 w-8" />
              {t("pettyCash.title", "Petty Cash Funds")}
            </h1>
            <p className="text-muted-foreground mt-1 dark:text-slate-400">
              {t(
                "pettyCash.list.description",
                "Manage your petty cash funds and transactions",
              )}
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2 dark:bg-primary dark:text-primary-foreground">
            <Plus className="h-4 w-4" />
            {t("pettyCash.createFund", "Create Fund")}
          </Button>
        </div>

        {/* ── Search + Inactive toggle ── */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-slate-400" />
            <Input
              placeholder={t("pettyCash.search", "Search funds...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={handleToggleInactive}
            />
            <Label
              htmlFor="show-inactive"
              className="cursor-pointer text-sm text-muted-foreground dark:text-slate-400"
            >
              Show inactive funds
            </Label>
          </div>
          <Button variant="outline" onClick={() => fetchFunds()} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* ── Funds Grid ── */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredFunds.length === 0 ? (
          <Card className="dark:bg-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4 dark:text-slate-400" />
              <p className="text-muted-foreground dark:text-slate-400">No petty cash funds found</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="mt-4 dark:bg-primary dark:text-primary-foreground"
              >
                Create your first fund
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {filteredFunds.map((fund) => (
              <Card
                key={fund._id}
                className="hover:shadow-lg transition-shadow dark:bg-slate-800"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg font-semibold leading-tight dark:text-white">
                      {fund.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 dark:text-slate-300"
                        title="Edit fund"
                        onClick={() => openEditDialog(fund)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Badge variant={fund.isActive ? "default" : "secondary"} className="dark:bg-slate-700 dark:text-slate-200">
                        {fund.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  {fund.custodian && (
                    <p className="text-sm text-muted-foreground dark:text-slate-400">
                      {t("pettyCash.custodian", "Custodian")}:{" "}
                      {fund.custodian.name}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Balance Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted rounded-lg dark:bg-slate-700">
                      <p className="text-xs text-muted-foreground mb-1 dark:text-slate-400">
                        {t("pettyCash.currentBalance", "Current Balance")}
                      </p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(fund.currentBalance)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg dark:bg-slate-700">
                      <p className="text-xs text-muted-foreground mb-1 dark:text-slate-400">
                        {t("pettyCash.floatAmount", "Float Amount")}
                      </p>
                      <p className="text-lg font-semibold dark:text-white">
                        {formatCurrency(fund.floatAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Imprest Mode Badge */}
                  {fund.imprestMode && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                        <Scale className="h-3 w-3 mr-1" />
                        Imprest Mode
                      </Badge>
                    </div>
                  )}

                  {/* Replenishment Alert */}
                  {fund.replenishmentNeeded > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 dark:text-amber-400" />
                      <span className="text-sm text-amber-800 dark:text-amber-300">
                        {t(
                          "pettyCash.replenishmentNeeded",
                          "Replenishment needed",
                        )}
                        : {formatCurrency(fund.replenishmentNeeded)}
                      </span>
                    </div>
                  )}

                  {/* Imprest Replenishment Alert */}
                  {fund.imprestMode && fund.imprestReplenishmentAmount > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                      <Calculator className="h-4 w-4 text-blue-600 shrink-0 dark:text-blue-400" />
                      <span className="text-sm text-blue-800 dark:text-blue-300">
                        Imprest replenishment: {formatCurrency(fund.imprestReplenishmentAmount)}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 min-w-[70px] dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => openTopUpDialog(fund)}
                    >
                      <TrendingUp className="h-3 w-3" />
                      {t("pettyCash.topUp", "Top Up")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 min-w-[70px] dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => openExpenseDialog(fund)}
                    >
                      <TrendingDown className="h-3 w-3" />
                      {t("pettyCash.recordExpense", "Expense")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 min-w-[80px] dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => openReplenishDialog(fund)}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Replenish
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="View transactions"
                      className="dark:text-slate-300"
                      onClick={() => viewTransactions(fund)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Advanced Actions */}
                  <div className="flex gap-2 flex-wrap border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 min-w-[90px] dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => openCashCountDialog(fund)}
                    >
                      <ClipboardCheck className="h-3 w-3" />
                      Cash Count
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 min-w-[100px] dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => openReconciliationsDialog(fund)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Reconciliations
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 min-w-[100px] dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => openReplenishmentsDialog(fund)}
                    >
                      <ArrowUpCircle className="h-3 w-3" />
                      Replenishments
                    </Button>
                    {fund.imprestMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1 min-w-[90px] dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                        onClick={() => openImprestDialog(fund)}
                      >
                        <Calculator className="h-3 w-3" />
                        Imprest
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            Create Fund Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                {t("pettyCash.createFund", "Create New Fund")}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Create a new petty cash fund for your organization
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Custodian notice — Fix A */}
              <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500 dark:text-blue-400" />
                <span>
                  Custodian will be set to <strong>you</strong>. Contact an
                  admin to change.
                </span>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-name" className="dark:text-slate-200">Fund Name *</Label>
                <Input
                  id="create-name"
                  value={newFundForm.name}
                  onChange={(e) =>
                    setNewFundForm({ ...newFundForm, name: e.target.value })
                  }
                  placeholder="e.g., Main Office Petty Cash"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-float" className="dark:text-slate-200">Float Amount *</Label>
                <Input
                  id="create-float"
                  type="number"
                  min={0}
                  value={newFundForm.floatAmount}
                  onChange={(e) =>
                    setNewFundForm({
                      ...newFundForm,
                      floatAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Target replenishment threshold"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-opening" className="dark:text-slate-200">Opening Balance</Label>
                <Input
                  id="create-opening"
                  type="number"
                  min={0}
                  value={newFundForm.openingBalance}
                  onChange={(e) =>
                    setNewFundForm({
                      ...newFundForm,
                      openingBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Initial cash on hand"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              {/* Imprest Mode Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg dark:bg-slate-700/50">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <Label className="dark:text-slate-200 font-medium">Imprest Mode</Label>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      Fixed float system with periodic replenishment
                    </p>
                  </div>
                </div>
                <Switch
                  checked={newFundForm.imprestMode}
                  onCheckedChange={(checked) =>
                    setNewFundForm({ ...newFundForm, imprestMode: checked })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-notes" className="dark:text-slate-200">Notes</Label>
                <Input
                  id="create-notes"
                  value={newFundForm.notes}
                  onChange={(e) =>
                    setNewFundForm({ ...newFundForm, notes: e.target.value })
                  }
                  placeholder="Optional notes"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button onClick={handleCreateFund} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Fund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Edit Fund Dialog — Fix C
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Edit Fund</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Update details for <strong>{selectedFund?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="dark:text-slate-200">Fund Name *</Label>
                <Input
                  id="edit-name"
                  value={editFundForm.name}
                  onChange={(e) =>
                    setEditFundForm({ ...editFundForm, name: e.target.value })
                  }
                  placeholder="Fund name"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-float" className="dark:text-slate-200">Float Amount *</Label>
                <Input
                  id="edit-float"
                  type="number"
                  min={0}
                  value={editFundForm.floatAmount}
                  onChange={(e) =>
                    setEditFundForm({
                      ...editFundForm,
                      floatAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Target float amount"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-notes" className="dark:text-slate-200">Notes</Label>
                <Input
                  id="edit-notes"
                  value={editFundForm.notes}
                  onChange={(e) =>
                    setEditFundForm({ ...editFundForm, notes: e.target.value })
                  }
                  placeholder="Optional notes"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button onClick={handleEditFund} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Top Up Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showTopUpDialog} onOpenChange={setShowTopUpDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                {t("pettyCash.topUp", "Top Up Petty Cash")}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Add funds to {selectedFund?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="p-3 bg-muted rounded-lg dark:bg-slate-700">
                <p className="text-sm text-muted-foreground dark:text-slate-400">Current Balance</p>
                <p className="text-lg font-semibold dark:text-white">
                  {selectedFund && formatCurrency(selectedFund.currentBalance)}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="topup-amount" className="dark:text-slate-200">Amount *</Label>
                <Input
                  id="topup-amount"
                  type="number"
                  min={0}
                  value={topUpForm.amount}
                  onChange={(e) =>
                    setTopUpForm({
                      ...topUpForm,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Amount to add"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="grid gap-2">
                <Label className="dark:text-slate-200">Source Bank Account *</Label>
                <Select
                  value={topUpForm.bank_account_id}
                  onValueChange={(value) =>
                    setTopUpForm({ ...topUpForm, bank_account_id: value })
                  }
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    {bankAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.name} (
                        {formatCurrency(
                          account.cachedBalance ??
                            account.currentBalance ??
                            account.openingBalance ??
                            0,
                        )}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="topup-desc" className="dark:text-slate-200">Description</Label>
                <Input
                  id="topup-desc"
                  value={topUpForm.description}
                  onChange={(e) =>
                    setTopUpForm({ ...topUpForm, description: e.target.value })
                  }
                  placeholder="Optional description"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="topup-date" className="dark:text-slate-200">Transaction Date</Label>
                <Input
                  id="topup-date"
                  type="date"
                  value={topUpForm.transactionDate}
                  onChange={(e) =>
                    setTopUpForm({
                      ...topUpForm,
                      transactionDate: e.target.value,
                    })
                  }
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTopUpDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button onClick={handleTopUp} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Top Up
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Record Expense Dialog — Fix E (dynamic accounts)
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                {t("pettyCash.recordExpense", "Record Expense")}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Record an expense from {selectedFund?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="p-3 bg-muted rounded-lg dark:bg-slate-700">
                <p className="text-sm text-muted-foreground dark:text-slate-400">
                  Available Balance
                </p>
                <p className="text-lg font-semibold dark:text-white">
                  {selectedFund && formatCurrency(selectedFund.currentBalance)}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="exp-amount" className="dark:text-slate-200">Amount *</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  min={0}
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Expense amount"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="grid gap-2">
                <Label className="dark:text-slate-200">Expense Account *</Label>
                <Select
                  value={expenseForm.expenseAccountId}
                  onValueChange={(value) =>
                    setExpenseForm({ ...expenseForm, expenseAccountId: value })
                  }
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select expense account" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    {activeExpenseAccounts.map((acct) => (
                      <SelectItem key={acct.code} value={acct.code}>
                        {acct.name} ({acct.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="exp-desc" className="dark:text-slate-200">Description *</Label>
                <Input
                  id="exp-desc"
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Expense description"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="exp-receipt" className="dark:text-slate-200">Receipt Reference</Label>
                <Input
                  id="exp-receipt"
                  value={expenseForm.receiptRef}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      receiptRef: e.target.value,
                    })
                  }
                  placeholder="Receipt number (optional)"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="exp-date" className="dark:text-slate-200">Transaction Date</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={expenseForm.transactionDate}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      transactionDate: e.target.value,
                    })
                  }
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowExpenseDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button onClick={handleRecordExpense} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Record Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Request Replenishment Dialog — Fix D
        ══════════════════════════════════════════════════════════ */}
        <Dialog
          open={showReplenishDialog}
          onOpenChange={setShowReplenishDialog}
        >
          <DialogContent className="sm:max-w-md dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Request Replenishment</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Submit a replenishment request for{" "}
                <strong>{selectedFund?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="p-3 bg-muted rounded-lg dark:bg-slate-700">
                <p className="text-sm text-muted-foreground dark:text-slate-400">Current Balance</p>
                <p className="text-lg font-semibold dark:text-white">
                  {selectedFund && formatCurrency(selectedFund.currentBalance)}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="replenish-amount" className="dark:text-slate-200">Amount *</Label>
                <Input
                  id="replenish-amount"
                  type="number"
                  min={0}
                  value={replenishForm.amount}
                  onChange={(e) =>
                    setReplenishForm({
                      ...replenishForm,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Requested replenishment amount"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="replenish-reason" className="dark:text-slate-200">Reason</Label>
                <Input
                  id="replenish-reason"
                  value={replenishForm.reason}
                  onChange={(e) =>
                    setReplenishForm({
                      ...replenishForm,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Reason for replenishment (optional)"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="grid gap-2">
                <Label className="dark:text-slate-200">Source Bank Account</Label>
                <Select
                  value={replenishForm.bank_account_id}
                  onValueChange={(value) =>
                    setReplenishForm({
                      ...replenishForm,
                      bank_account_id: value,
                    })
                  }
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select bank account (optional)" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    {bankAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.name} (
                        {formatCurrency(
                          account.cachedBalance ??
                            account.currentBalance ??
                            account.openingBalance ??
                            0,
                        )}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowReplenishDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button onClick={handleReplenishment} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Cash Count Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showCashCountDialog} onOpenChange={setShowCashCountDialog}>
          <DialogContent className="sm:max-w-lg dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="dark:text-white flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Cash Count
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Record physical cash count for <strong>{selectedFund?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* System Balance Display */}
              <div className="p-3 bg-slate-50 rounded-lg dark:bg-slate-700/50">
                <p className="text-sm text-muted-foreground dark:text-slate-400">System Balance</p>
                <p className="text-xl font-semibold dark:text-white">
                  {selectedFund && formatCurrency(selectedFund.currentBalance)}
                </p>
              </div>

              {/* Count Date */}
              <div className="grid gap-2">
                <Label htmlFor="count-date" className="dark:text-slate-200">Count Date</Label>
                <Input
                  id="count-date"
                  type="date"
                  value={cashCountForm.countDate}
                  onChange={(e) =>
                    setCashCountForm({ ...cashCountForm, countDate: e.target.value })
                  }
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              {/* Denominations */}
              <div className="grid gap-2">
                <Label className="dark:text-slate-200">Cash Denominations</Label>
                <div className="border rounded-lg overflow-hidden dark:border-slate-600">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-left dark:text-slate-200">Denomination</th>
                        <th className="px-3 py-2 text-left dark:text-slate-200">Count</th>
                        <th className="px-3 py-2 text-right dark:text-slate-200">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-600">
                      {cashCountForm.denominations.map((denom, index) => (
                        <tr key={denom.denomination}>
                          <td className="px-3 py-2 dark:text-slate-300">
                            {formatCurrency(denom.denomination)}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              value={denom.count || ""}
                              onChange={(e) =>
                                handleDenominationChange(index, parseInt(e.target.value) || 0)
                              }
                              className="w-20 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium dark:text-slate-300">
                            {formatCurrency(denom.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Physical Total */}
              <div className="p-3 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-800 dark:text-blue-300">Physical Cash Total</span>
                  <span className="text-xl font-bold text-blue-800 dark:text-blue-300">
                    {formatCurrency(calculatePhysicalTotal())}
                  </span>
                </div>
              </div>

              {/* Difference Preview */}
              {selectedFund && (
                <div className={`p-3 rounded-lg ${
                  calculatePhysicalTotal() === selectedFund.currentBalance
                    ? "bg-green-50 dark:bg-green-900/20"
                    : calculatePhysicalTotal() < selectedFund.currentBalance
                    ? "bg-red-50 dark:bg-red-900/20"
                    : "bg-amber-50 dark:bg-amber-900/20"
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${
                      calculatePhysicalTotal() === selectedFund.currentBalance
                        ? "text-green-800 dark:text-green-300"
                        : calculatePhysicalTotal() < selectedFund.currentBalance
                        ? "text-red-800 dark:text-red-300"
                        : "text-amber-800 dark:text-amber-300"
                    }`}>
                      {calculatePhysicalTotal() === selectedFund.currentBalance
                        ? "Balanced ✓"
                        : calculatePhysicalTotal() < selectedFund.currentBalance
                        ? "Shortage"
                        : "Overage"}
                    </span>
                    <span className={`text-lg font-bold ${
                      calculatePhysicalTotal() === selectedFund.currentBalance
                        ? "text-green-800 dark:text-green-300"
                        : calculatePhysicalTotal() < selectedFund.currentBalance
                        ? "text-red-800 dark:text-red-300"
                        : "text-amber-800 dark:text-amber-300"
                    }`}>
                      {formatCurrency(calculatePhysicalTotal() - selectedFund.currentBalance)}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="count-notes" className="dark:text-slate-200">Notes</Label>
                <Input
                  id="count-notes"
                  value={cashCountForm.notes}
                  onChange={(e) =>
                    setCashCountForm({ ...cashCountForm, notes: e.target.value })
                  }
                  placeholder="Optional notes about the count"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCashCountDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitCashCount}
                disabled={submitting || calculatePhysicalTotal() === 0}
                className="dark:bg-primary dark:text-primary-foreground"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Count
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Reconciliations Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showReconciliationsDialog} onOpenChange={setShowReconciliationsDialog}>
          <DialogContent className="sm:max-w-2xl dark:bg-slate-800 max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="dark:text-white flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Cash Count Reconciliations
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                History of cash counts for <strong>{selectedFund?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {loadingReconciliations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : reconciliations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                  No reconciliations recorded yet
                </div>
              ) : (
                <div className="space-y-3">
                  {reconciliations.map((rec) => (
                    <div
                      key={rec._id}
                      className="p-4 border rounded-lg dark:border-slate-600 dark:bg-slate-700/50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium dark:text-white">{rec.reconciliationNumber}</p>
                          <p className="text-sm text-muted-foreground dark:text-slate-400">
                            {new Date(rec.countDate).toLocaleDateString()} • Counted by{" "}
                            {rec.countedBy?.name}
                          </p>
                        </div>
                        <Badge
                          variant={
                            rec.status === "approved"
                              ? "default"
                              : rec.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                          className={
                            rec.status === "approved"
                              ? "dark:bg-green-600 dark:text-white"
                              : rec.status === "rejected"
                              ? "dark:bg-red-600 dark:text-white"
                              : "dark:bg-slate-600 dark:text-slate-200"
                          }
                        >
                          {rec.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground dark:text-slate-400">System</p>
                          <p className="font-medium dark:text-slate-300">{formatCurrency(rec.systemBalance)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground dark:text-slate-400">Physical</p>
                          <p className="font-medium dark:text-slate-300">{formatCurrency(rec.physicalCashTotal)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground dark:text-slate-400">Difference</p>
                          <p
                            className={`font-medium ${
                              rec.differenceType === "balanced"
                                ? "text-green-600 dark:text-green-400"
                                : rec.differenceType === "shortage"
                                ? "text-red-600 dark:text-red-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {rec.differenceType === "balanced"
                              ? "✓"
                              : rec.differenceType === "shortage"
                              ? "-"
                              : "+"}
                            {formatCurrency(Math.abs(rec.difference))}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons for pending reconciliations with shortage/overage */}
                      {rec.status === "pending" && rec.differenceType !== "balanced" && (
                        <div className="mt-4 pt-3 border-t dark:border-slate-600 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20"
                            onClick={() => openApproveDialog(rec)}
                          >
                            Approve {rec.differenceType === "shortage" ? "Shortage" : "Overage"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                            onClick={() => {
                              setSelectedReconciliation(rec);
                              setApprovalForm({ status: "rejected", discrepancyExplanation: "" });
                              setShowApproveDialog(true);
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      )}

                      {/* Show journal entry info for approved reconciliations with difference */}
                      {rec.status === "approved" && rec.differenceType !== "balanced" && (
                        <div className="mt-3 pt-3 border-t dark:border-slate-600">
                          <p className="text-xs text-muted-foreground dark:text-slate-400">
                            {rec.differenceType === "shortage"
                              ? "Shortage recorded as expense"
                              : "Overage recorded as income"}
                            {rec.approvedBy?.name && ` • Approved by ${rec.approvedBy.name}`}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowReconciliationsDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Imprest Calculation Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showImprestDialog} onOpenChange={setShowImprestDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Imprest Calculation
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Fixed float replenishment calculation for <strong>{selectedFund?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {!imprestCalculation ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : !imprestCalculation.isImprest ? (
                <div className="p-4 bg-amber-50 rounded-lg dark:bg-amber-900/20">
                  <p className="text-amber-800 dark:text-amber-300">
                    This fund is not in imprest mode. Enable imprest mode to use fixed float replenishment.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-blue-800 dark:text-blue-300">Fixed Float Amount</span>
                      <span className="font-bold text-blue-800 dark:text-blue-300">
                        {formatCurrency(imprestCalculation.floatAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-800 dark:text-blue-300">Current Balance</span>
                      <span className="font-bold text-blue-800 dark:text-blue-300">
                        {formatCurrency(imprestCalculation.currentBalance)}
                      </span>
                    </div>
                    <div className="border-t border-blue-200 dark:border-blue-800 pt-3">
                      <div className="flex justify-between">
                        <span className="text-blue-800 dark:text-blue-300 font-medium">
                          Replenishment Needed
                        </span>
                        <span className="font-bold text-lg text-blue-800 dark:text-blue-300">
                          {formatCurrency(imprestCalculation.replenishmentAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground dark:text-slate-400">
                    <p className="font-medium mb-1">How Imprest Works:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>The fund maintains a fixed float amount</li>
                      <li>Expenses reduce the current balance</li>
                      <li>Replenishment restores to the fixed amount</li>
                      <li>Prevents over-funding and improves control</li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowImprestDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </Button>
              {imprestCalculation?.isImprest && imprestCalculation?.replenishmentAmount > 0 && (
                <Button
                  onClick={() => {
                    setShowImprestDialog(false);
                    openReplenishDialog(selectedFund);
                    setReplenishForm({
                      amount: imprestCalculation.replenishmentAmount,
                      reason: "Imprest replenishment",
                      bank_account_id: "",
                    });
                  }}
                  className="dark:bg-primary dark:text-primary-foreground"
                >
                  Create Replenishment
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Reconciliation Approval Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                {selectedReconciliation?.differenceType === "shortage"
                  ? "Approve Shortage"
                  : selectedReconciliation?.differenceType === "overage"
                  ? "Approve Overage"
                  : "Approve Reconciliation"}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {selectedReconciliation?.reconciliationNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Summary of the difference */}
              {selectedReconciliation && (
                <div
                  className={`p-4 rounded-lg ${
                    selectedReconciliation.differenceType === "shortage"
                      ? "bg-red-50 dark:bg-red-900/20"
                      : "bg-amber-50 dark:bg-amber-900/20"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={
                        selectedReconciliation.differenceType === "shortage"
                          ? "text-red-800 dark:text-red-300"
                          : "text-amber-800 dark:text-amber-300"
                      }
                    >
                      {selectedReconciliation.differenceType === "shortage"
                        ? "Shortage Amount"
                        : "Overage Amount"}
                    </span>
                    <span
                      className={`font-bold text-lg ${
                        selectedReconciliation.differenceType === "shortage"
                          ? "text-red-800 dark:text-red-300"
                          : "text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      {formatCurrency(Math.abs(selectedReconciliation.difference))}
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-2 ${
                      selectedReconciliation.differenceType === "shortage"
                        ? "text-red-700 dark:text-red-400"
                        : "text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {selectedReconciliation.differenceType === "shortage"
                      ? "This will record the shortage as a miscellaneous expense."
                      : "This will record the overage as other income."}
                  </p>
                </div>
              )}

              {/* Status selection */}
              <div className="grid gap-2">
                <Label className="dark:text-slate-200">Decision</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={approvalForm.status === "approved" ? "default" : "outline"}
                    onClick={() => setApprovalForm({ ...approvalForm, status: "approved" })}
                    className="flex-1 dark:text-slate-200"
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant={approvalForm.status === "rejected" ? "destructive" : "outline"}
                    onClick={() => setApprovalForm({ ...approvalForm, status: "rejected" })}
                    className="flex-1 dark:text-slate-200"
                  >
                    Reject
                  </Button>
                </div>
              </div>

              {/* Explanation for discrepancy */}
              <div className="grid gap-2">
                <Label htmlFor="explanation" className="dark:text-slate-200">
                  Explanation / Notes
                  {approvalForm.status === "approved" && (
                    <span className="text-red-500"> *</span>
                  )}
                </Label>
                <Input
                  id="explanation"
                  value={approvalForm.discrepancyExplanation}
                  onChange={(e) =>
                    setApprovalForm({ ...approvalForm, discrepancyExplanation: e.target.value })
                  }
                  placeholder="Explain the reason for shortage/overage..."
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowApproveDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApproveReconciliation}
                disabled={
                  submitting ||
                  (approvalForm.status === "approved" && !approvalForm.discrepancyExplanation)
                }
                variant={approvalForm.status === "rejected" ? "destructive" : "default"}
                className="dark:bg-primary dark:text-primary-foreground"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {approvalForm.status === "approved" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Replenishments List Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showReplenishmentsDialog} onOpenChange={setShowReplenishmentsDialog}>
          <DialogContent className="sm:max-w-lg dark:bg-slate-800 max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                Replenishment Requests - {selectedFund?.name}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                View and manage replenishment requests
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {loadingReplenishments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : replenishments.length === 0 ? (
                <p className="text-muted-foreground dark:text-slate-400 text-center py-8">
                  No replenishment requests found
                </p>
              ) : (
                <div className="space-y-3">
                  {replenishments.map((rep) => (
                    <div
                      key={rep._id}
                      className="border rounded-lg p-3 dark:border-slate-600 dark:bg-slate-700/30"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium dark:text-slate-200">
                            {rep.replenishmentNumber || rep._id.slice(-6)}
                          </p>
                          <p className="text-xs text-muted-foreground dark:text-slate-400">
                            {new Date(rep.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            rep.status === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : rep.status === "approved"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : rep.status === "rejected"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <p className="text-muted-foreground dark:text-slate-400">Requested</p>
                          <p className="font-medium dark:text-slate-300">
                            {formatCurrency(rep.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground dark:text-slate-400">Actual</p>
                          <p className="font-medium dark:text-slate-300">
                            {rep.actualAmount ? formatCurrency(rep.actualAmount) : "-"}
                          </p>
                        </div>
                      </div>

                      {rep.reason && (
                        <p className="text-sm text-muted-foreground dark:text-slate-400 mb-2">
                          Reason: {rep.reason}
                        </p>
                      )}

                      {/* Action buttons */}
                      {rep.status === "pending" && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20"
                            onClick={() => handleApproveReplenishment(rep, "approved")}
                            disabled={submitting}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                            onClick={() => handleApproveReplenishment(rep, "rejected")}
                            disabled={submitting}
                          >
                            Reject
                          </Button>
                        </div>
                      )}

                      {rep.status === "approved" && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            onClick={() => openCompleteReplenishmentDialog(rep)}
                            disabled={submitting}
                          >
                            Complete
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowReplenishmentsDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Complete Replenishment Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showReplenishmentCompleteDialog} onOpenChange={setShowReplenishmentCompleteDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Complete Replenishment</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {selectedReplenishment?.replenishmentNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="dark:text-slate-200">Requested Amount</Label>
                <p className="text-lg font-medium dark:text-slate-300">
                  {formatCurrency(selectedReplenishment?.amount || 0)}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="actualAmount" className="dark:text-slate-200">
                  Actual Amount Received *
                </Label>
                <Input
                  id="actualAmount"
                  type="number"
                  value={replenishmentCompleteForm.actualAmount}
                  onChange={(e) =>
                    setReplenishmentCompleteForm({
                      ...replenishmentCompleteForm,
                      actualAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="completeNotes" className="dark:text-slate-200">
                  Notes
                </Label>
                <Input
                  id="completeNotes"
                  value={replenishmentCompleteForm.notes}
                  onChange={(e) =>
                    setReplenishmentCompleteForm({
                      ...replenishmentCompleteForm,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Enter completion notes..."
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowReplenishmentCompleteDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteReplenishment}
                disabled={submitting || replenishmentCompleteForm.actualAmount <= 0}
                className="dark:bg-primary dark:text-primary-foreground"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Replenishment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
