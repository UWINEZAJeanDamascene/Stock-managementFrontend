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

  // ── Selected fund for dialogs ────────────────────────────────────────────────
  const [selectedFund, setSelectedFund] = useState<any | null>(null);

  // ── Create Fund form (no custodianId — backend defaults to req.user) ─────────
  const [newFundForm, setNewFundForm] = useState({
    name: "",
    floatAmount: 0,
    openingBalance: 0,
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
        notes: newFundForm.notes || undefined,
      });
      if (response.success) {
        toast.success("Petty cash fund created successfully");
        setShowCreateDialog(false);
        setNewFundForm({
          name: "",
          floatAmount: 0,
          openingBalance: 0,
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
      const response = await pettyCashApi.createReplenishment(payload);
      if (response.success) {
        toast.success("Replenishment request submitted successfully");
        setShowReplenishDialog(false);
        setReplenishForm({ amount: 0, reason: "", bank_account_id: "" });
        fetchFunds();
      } else {
        toast.error("Failed to submit replenishment request");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Replenishment error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to submit replenishment request",
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      </div>
    </Layout>
  );
}
