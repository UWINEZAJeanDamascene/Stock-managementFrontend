import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { budgetsApi, Budget } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Power,
  Loader2,
  AlertCircle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
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
import { Textarea } from "@/app/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { toast } from "sonner";

interface SummaryData {
  budgets: Array<{
    _id: string;
    budgetId: string;
    name: string;
    type: string;
    budgetedAmount: number;
    actualAmount: number;
    variance: number;
    variancePercent: number;
    utilization: number;
    isOnTrack: boolean;
  }>;
  totals: {
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
  };
  status: {
    onTrack: number;
    exceeded: number;
    total: number;
  };
  pendingApprovals: number;
  draftBudgets: number;
}

export default function BudgetsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(20);

  // Filters
  const [filters, setFilters] = useState({
    status: "",
    fiscal_year: "",
    type: "",
  });

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Clone form
  const [cloneForm, setCloneForm] = useState({
    newPeriodStart: "",
    newPeriodEnd: "",
    newName: "",
  });

  // Reject form
  const [rejectReason, setRejectReason] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit,
      };
      if (filters.status) params.status = filters.status;
      if (filters.fiscal_year) params.fiscal_year = filters.fiscal_year;
      if (filters.type) params.type = filters.type;
      if (searchQuery) params.search = searchQuery;

      const response: any = await budgetsApi.getAll(params);
      if (response.success) {
        setBudgets(response.data || []);
        setTotalCount(response.pagination?.total || 0);
        setTotalPages(response.pagination?.pages || 1);
      }
    } catch (error) {
      console.error("[BudgetsListPage] Failed to fetch budgets:", error);
      toast.error(t("budgets.errors.fetchFailed", "Failed to load budgets"));
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, filters, searchQuery, t]);

  const fetchSummary = useCallback(async () => {
    try {
      const response: any = await budgetsApi.getSummary();
      if (response.success) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error("[BudgetsListPage] Failed to fetch summary:", error);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
    fetchSummary();
  }, [fetchBudgets, fetchSummary]);

  const handleDeleteBudget = async () => {
    if (!selectedBudget) return;
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.delete(selectedBudget._id);
      if (response.success) {
        toast.success(
          t("budgets.messages.deleted", "Budget deleted successfully"),
        );
        setShowDeleteDialog(false);
        setSelectedBudget(null);
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          t("budgets.errors.deleteFailed", "Failed to delete budget"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedBudget) return;
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.approve(selectedBudget._id);
      if (response.success) {
        toast.success(
          t("budgets.messages.approved", "Budget approved successfully"),
        );
        setShowApproveDialog(false);
        setSelectedBudget(null);
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          t("budgets.errors.approveFailed", "Failed to approve budget"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBudget) return;
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.reject(
        selectedBudget._id,
        rejectReason,
      );
      if (response.success) {
        toast.success(t("budgets.messages.rejected", "Budget rejected"));
        setShowRejectDialog(false);
        setSelectedBudget(null);
        setRejectReason("");
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          t("budgets.errors.rejectFailed", "Failed to reject budget"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLock = async () => {
    if (!selectedBudget) return;
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.lock(selectedBudget._id);
      if (response.success) {
        toast.success(
          t("budgets.messages.locked", "Budget locked successfully"),
        );
        setShowLockDialog(false);
        setSelectedBudget(null);
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          t("budgets.errors.lockFailed", "Failed to lock budget"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlock = async () => {
    if (!selectedBudget) return;
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.unlock(selectedBudget._id);
      if (response.success) {
        toast.success(
          t("budgets.messages.unlocked", "Budget unlocked successfully"),
        );
        setShowUnlockDialog(false);
        setSelectedBudget(null);
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          t("budgets.errors.unlockFailed", "Failed to unlock budget"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!selectedBudget) return;
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.close(
        selectedBudget._id,
        closeNotes,
      );
      if (response.success) {
        toast.success(
          t("budgets.messages.closed", "Budget closed successfully"),
        );
        setShowCloseDialog(false);
        setSelectedBudget(null);
        setCloseNotes("");
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          t("budgets.errors.closeFailed", "Failed to close budget"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClone = async () => {
    if (!selectedBudget) return;
    if (!cloneForm.newPeriodStart || !cloneForm.newPeriodEnd) {
      toast.error(
        t("budgets.errors.periodRequired", "Period dates are required"),
      );
      return;
    }
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.clone(selectedBudget._id, {
        newPeriodStart: cloneForm.newPeriodStart,
        newPeriodEnd: cloneForm.newPeriodEnd,
        newName: cloneForm.newName || undefined,
      });
      if (response.success) {
        toast.success(
          t("budgets.messages.cloned", "Budget cloned successfully"),
        );
        setShowCloneDialog(false);
        setSelectedBudget(null);
        setCloneForm({ newPeriodStart: "", newPeriodEnd: "", newName: "" });
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          t("budgets.errors.cloneFailed", "Failed to clone budget"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    try {
      const dataToExport = budgets.map((b) => ({
        Name: b.name,
        Type: b.type,
        Status: b.status,
        "Fiscal Year": b.fiscal_year || "",
        Amount: b.amount,
        Description: b.description || "",
        "Period Start": b.periodStart
          ? new Date(b.periodStart).toLocaleDateString()
          : "",
        "Period End": b.periodEnd
          ? new Date(b.periodEnd).toLocaleDateString()
          : "",
        "Created At": b.createdAt
          ? new Date(b.createdAt).toLocaleDateString()
          : "",
      }));
      // Simple CSV export
      const headers = Object.keys(dataToExport[0] || {});
      const csv = [
        headers.join(","),
        ...dataToExport.map((row) =>
          headers.map((h) => `"${(row as any)[h]}"`).join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `budgets_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("common.exported", "Exported successfully"));
    } catch (error) {
      toast.error(t("common.exportFailed", "Export failed"));
    }
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    // Handle Decimal128 from MongoDB (which comes as string) or null/undefined
    const numericAmount = amount == null
      ? 0
      : typeof amount === 'string'
        ? parseFloat(amount)
        : Number(amount) || 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(numericAmount);
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: string; className: string }> = {
      draft: {
        variant: "outline",
        className:
          "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      },
      active: { variant: "default", className: "bg-blue-500" },
      approved: { variant: "default", className: "bg-green-500" },
      locked: { variant: "secondary", className: "bg-amber-500 text-white" },
      closed: {
        variant: "outline",
        className:
          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      },
      cancelled: { variant: "destructive", className: "" },
    };
    const { variant, className } = config[status] || config.draft;
    return (
      <Badge variant={variant as any} className={className}>
        {t(`budgets.status.${status}`, status)}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { className: string }> = {
      revenue: {
        className:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
      },
      expense: {
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      },
      profit: {
        className:
          "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      },
    };
    const { className } = config[type] || config.expense;
    return (
      <Badge variant="outline" className={className}>
        {t(`budgets.types.${type}`, type)}
      </Badge>
    );
  };

  const currentYear = new Date().getFullYear();
  const fiscalYears = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  // Action eligibility
  const canEdit = (b: Budget) => b.status === "draft";
  const canDelete = (b: Budget) => b.status === "draft";
  const canApprove = (b: Budget) => b.status === "draft";
  const canReject = (b: Budget) =>
    b.status === "draft" || b.status === "approved";
  const canLock = (b: Budget) => b.status === "approved";
  const canUnlock = (b: Budget) => b.status === "locked";
  const canClose = (b: Budget) =>
    b.status === "approved" || b.status === "locked";
  const canClone = () => true;

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <DollarSign className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold dark:text-white">
                {t("budgets.title", "Budgets")}
              </h1>
              <p className="text-muted-foreground dark:text-slate-400">
                {t("budgets.subtitle", "Manage budgets and track spending")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              <Download className="mr-2 h-4 w-4" />
              {t("common.export", "Export")}
            </Button>
            <Button onClick={() => navigate("/budgets/new")} className="dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">
              <Plus className="mr-2 h-4 w-4" />
              {t("budgets.addBudget", "Add Budget")}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {t("budgets.totalBudgeted", "Total Budgeted")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold dark:text-white">
                  {formatCurrency(summary.totals.totalBudgeted)}
                </div>
                <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">
                  {summary.status.total} {t("budgets.budgets", "budgets")}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  {t("budgets.totalActual", "Total Actual")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold dark:text-white">
                  {formatCurrency(summary.totals.totalActual)}
                </div>
                <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">
                  {t("budgets.spent", "Spent")}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400 flex items-center gap-2">
                  {summary.totals.totalVariance >= 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                  {t("budgets.totalVariance", "Total Variance")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    summary.totals.totalVariance >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {formatCurrency(summary.totals.totalVariance)}
                </div>
                <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">
                  {summary.totals.totalVariance >= 0
                    ? t("budgets.underBudget", "Under budget")
                    : t("budgets.overBudget", "Over budget")}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400 flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  {t("budgets.statusSummary", "Status")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  <div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {summary.status.onTrack}
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("budgets.onTrack", "On Track")}
                    </p>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">
                      {summary.status.exceeded}
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("budgets.exceeded", "Exceeded")}
                    </p>
                  </div>
                </div>
                {summary.pendingApprovals > 0 && (
                  <Badge
                    variant="outline"
                    className="mt-2 bg-yellow-50 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  >
                    {summary.pendingApprovals} {t("budgets.pending", "pending")}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6 dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-slate-400" />
                <Input
                  placeholder={t(
                    "budgets.searchPlaceholder",
                    "Search budgets...",
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchBudgets()}
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                />
              </div>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue
                    placeholder={t("budgets.filterStatus", "Status")}
                  />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="all" className="dark:text-slate-200">
                    {t("budgets.allStatuses", "All Statuses")}
                  </SelectItem>
                  <SelectItem value="draft" className="dark:text-slate-200">
                    {t("budgets.status.draft", "Draft")}
                  </SelectItem>
                  <SelectItem value="active" className="dark:text-slate-200">
                    {t("budgets.status.active", "Active")}
                  </SelectItem>
                  <SelectItem value="approved" className="dark:text-slate-200">
                    {t("budgets.status.approved", "Approved")}
                  </SelectItem>
                  <SelectItem value="locked" className="dark:text-slate-200">
                    {t("budgets.status.locked", "Locked")}
                  </SelectItem>
                  <SelectItem value="closed" className="dark:text-slate-200">
                    {t("budgets.status.closed", "Closed")}
                  </SelectItem>
                  <SelectItem value="cancelled" className="dark:text-slate-200">
                    {t("budgets.status.cancelled", "Cancelled")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  setFilters({ ...filters, type: value === "all" ? "" : value })
                }
              >
                <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue placeholder={t("budgets.filterType", "Type")} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="all" className="dark:text-slate-200">
                    {t("budgets.allTypes", "All Types")}
                  </SelectItem>
                  <SelectItem value="expense" className="dark:text-slate-200">
                    {t("budgets.types.expense", "Expense")}
                  </SelectItem>
                  <SelectItem value="revenue" className="dark:text-slate-200">
                    {t("budgets.types.revenue", "Revenue")}
                  </SelectItem>
                  <SelectItem value="profit" className="dark:text-slate-200">
                    {t("budgets.types.profit", "Profit")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.fiscal_year}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    fiscal_year: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue
                    placeholder={t("budgets.filterYear", "Fiscal Year")}
                  />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="all" className="dark:text-slate-200">
                    {t("budgets.allYears", "All Years")}
                  </SelectItem>
                  {fiscalYears.map((year) => (
                    <SelectItem key={year} value={year.toString()} className="dark:text-slate-200">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setFilters({ status: "", fiscal_year: "", type: "" });
                  setSearchQuery("");
                }}
                className="dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("common.clearFilters", "Clear Filters")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Budgets Table */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin dark:text-slate-400" />
              </div>
            ) : budgets.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground dark:text-slate-400" />
                <p className="text-muted-foreground dark:text-slate-400">
                  {t("budgets.noBudgets", "No budgets found")}
                </p>
                <Button
                  className="mt-4 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                  onClick={() => navigate("/budgets/new")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("budgets.createFirst", "Create First Budget")}
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700/50">
                      <TableHead className="dark:text-slate-200">{t("budgets.name", "Name")}</TableHead>
                      <TableHead className="dark:text-slate-200">{t("budgets.type", "Type")}</TableHead>
                      <TableHead className="dark:text-slate-200">
                        {t("budgets.fiscalYear", "Fiscal Year")}
                      </TableHead>
                      <TableHead className="dark:text-slate-200">{t("budgets.period", "Period")}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">
                        {t("budgets.amount", "Amount")}
                      </TableHead>
                      <TableHead className="dark:text-slate-200">
                        {t("budgets.statusLabel", "Status")}
                      </TableHead>
                      <TableHead className="text-right dark:text-slate-200">
                        {t("common.actions", "Actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="dark:bg-slate-800">
                    {budgets.map((budget) => (
                      <TableRow key={budget._id} className="dark:hover:bg-slate-700/30">
                        <TableCell className="font-medium dark:text-slate-200">
                          <div>
                            <div className="font-semibold dark:text-white">{budget.name}</div>
                            {budget.description && (
                              <div className="text-xs text-muted-foreground dark:text-slate-400 truncate max-w-[200px]">
                                {budget.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(budget.type)}</TableCell>
                        <TableCell className="font-medium dark:text-slate-300">
                          {budget.fiscal_year || "-"}
                        </TableCell>
                        <TableCell className="dark:text-slate-300">
                          {budget.periodStart || budget.periodEnd ? (
                            <div className="text-xs">
                              <div>{formatDate(budget.periodStart)}</div>
                              <div className="text-muted-foreground dark:text-slate-400">
                                to {formatDate(budget.periodEnd)}
                              </div>
                            </div>
                          ) : (
                            <span className="capitalize text-xs text-muted-foreground dark:text-slate-400">
                              {budget.periodType}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium dark:text-slate-200">
                          {formatCurrency((budget as any).totalBudgeted ?? budget.amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(budget.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/budgets/${budget._id}`)}
                              title={t("common.view", "View")}
                              className="dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  navigate(`/budgets/${budget._id}/edit`)
                                }
                                title={t("common.edit", "Edit")}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canApprove(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBudget(budget);
                                  setShowApproveDialog(true);
                                }}
                                title={t("budgets.approve", "Approve")}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {canReject(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBudget(budget);
                                  setShowRejectDialog(true);
                                }}
                                title={t("budgets.reject", "Reject")}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                            {canLock(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBudget(budget);
                                  setShowLockDialog(true);
                                }}
                                title={t("budgets.lock", "Lock")}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <Lock className="h-4 w-4 text-amber-600" />
                              </Button>
                            )}
                            {canUnlock(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBudget(budget);
                                  setShowUnlockDialog(true);
                                }}
                                title={t("budgets.unlock", "Unlock")}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <Unlock className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {canClose(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBudget(budget);
                                  setShowCloseDialog(true);
                                }}
                                title={t("budgets.close", "Close")}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <Power className="h-4 w-4 text-slate-600" />
                              </Button>
                            )}
                            {canClone() && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBudget(budget);
                                  setCloneForm({
                                    newName: `${budget.name} (Copy)`,
                                    newPeriodStart: "",
                                    newPeriodEnd: "",
                                  });
                                  setShowCloneDialog(true);
                                }}
                                title={t("budgets.clone", "Clone")}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBudget(budget);
                                  setShowDeleteDialog(true);
                                }}
                                title={t("common.delete", "Delete")}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-4 border-t dark:border-slate-700">
                  <div className="text-sm text-muted-foreground dark:text-slate-400">
                    {t("common.showing", "Showing")}{" "}
                    {(currentPage - 1) * limit + 1} {t("common.to", "to")}{" "}
                    {Math.min(currentPage * limit, totalCount)}{" "}
                    {t("common.of", "of")} {totalCount}{" "}
                    {t("budgets.budgets", "budgets")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm dark:text-slate-300">
                      {t("common.page", "Page")} {currentPage}{" "}
                      {t("common.of", "of")} {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Select
                      value={limit.toString()}
                      onValueChange={(val) => {
                        setLimit(parseInt(val));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[80px] dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="10" className="dark:text-slate-200">10</SelectItem>
                        <SelectItem value="20" className="dark:text-slate-200">20</SelectItem>
                        <SelectItem value="50" className="dark:text-slate-200">50</SelectItem>
                        <SelectItem value="100" className="dark:text-slate-200">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Approve Confirmation Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                {t("budgets.approveTitle", "Approve Budget")}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {t(
                  "budgets.approveDescription",
                  "Are you sure you want to approve this budget? This action will move it to approved status.",
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowApproveDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleApprove}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("budgets.approve", "Approve")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                {t("budgets.deleteTitle", "Delete Budget")}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {t(
                  "budgets.deleteDescription",
                  "Are you sure you want to delete this budget? All budget lines will be removed. This action cannot be undone.",
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteBudget}
                disabled={submitting}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("common.delete", "Delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                {t("budgets.rejectTitle", "Reject Budget")}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {t(
                  "budgets.rejectDescription",
                  "Provide a reason for rejecting this budget (optional).",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label className="dark:text-slate-200">{t("budgets.rejectionReason", "Reason")}</Label>
              <Textarea
                className="mt-2 dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                placeholder={t(
                  "budgets.rejectionReasonPlaceholder",
                  "Reason for rejection",
                )}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={submitting}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("budgets.reject", "Reject")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lock Dialog */}
        <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t("budgets.lockTitle", "Lock Budget")}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {t(
                  "budgets.lockDescription",
                  "Lock this budget to prevent further changes. This action can only be reversed by an administrator.",
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowLockDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleLock}
                disabled={submitting}
                className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("budgets.lock", "Lock")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unlock Dialog */}
        <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t("budgets.unlockTitle", "Unlock Budget")}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {t(
                  "budgets.unlockDescription",
                  "Unlock this budget to allow modifications. The budget will return to approved status.",
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUnlockDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleUnlock}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("budgets.unlock", "Unlock")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Close Dialog */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                {t("budgets.closeTitle", "Close Budget")}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {t(
                  "budgets.closeDescription",
                  "Close this budget to finalize it. No further modifications will be possible.",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label className="dark:text-slate-200">{t("budgets.closeNotes", "Close Notes")}</Label>
              <Textarea
                className="mt-2 dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                placeholder={t(
                  "budgets.closeNotesPlaceholder",
                  "Optional closing notes",
                )}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCloseDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={handleClose} disabled={submitting} className="dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("budgets.close", "Close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clone Dialog */}
        <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                {t("budgets.cloneTitle", "Clone Budget")}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {t(
                  "budgets.cloneDescription",
                  "Create a copy of this budget for a new period.",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t("budgets.newName", "New Name")}</Label>
                <Input
                  placeholder={
                    selectedBudget
                      ? `${selectedBudget.name} (Copy)`
                      : "Budget Name (Copy)"
                  }
                  value={cloneForm.newName}
                  onChange={(e) =>
                    setCloneForm({ ...cloneForm, newName: e.target.value })
                  }
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">
                    {t("budgets.newPeriodStart", "New Period Start")} *
                  </Label>
                  <Input
                    type="date"
                    value={cloneForm.newPeriodStart}
                    onChange={(e) =>
                      setCloneForm({
                        ...cloneForm,
                        newPeriodStart: e.target.value,
                      })
                    }
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t("budgets.newPeriodEnd", "New Period End")} *</Label>
                  <Input
                    type="date"
                    value={cloneForm.newPeriodEnd}
                    onChange={(e) =>
                      setCloneForm({
                        ...cloneForm,
                        newPeriodEnd: e.target.value,
                      })
                    }
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCloneDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={handleClone} disabled={submitting} className="dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("budgets.clone", "Clone")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
