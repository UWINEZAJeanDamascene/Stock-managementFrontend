import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  budgetsApi,
  chartOfAccountsApi,
  projectsApi,
  Budget,
  BudgetLine,
  ChartOfAccountItem,
  Encumbrance,
  BudgetActualConsumption,
  type Project,
} from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Progress } from "../../components/ui/progress";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Power,
  BarChart3,
  TrendingUp,
  TrendingDown,
  FileText,
  CalendarDays,
  ArrowRightLeft,
  Lock as LockIcon,
  Bell,
  History,
  FolderTree,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Wallet,
  Eye,
  Receipt,
  Sparkles,
  Target,
  Layers,
  CircleDollarSign,
  Activity,
  Landmark,
  Clock,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useFormatCurrency } from '@/lib/currencyUtils';

// Import budget panel components
import { BudgetTransferPanel } from "./BudgetTransferPanel";
import { BudgetEncumbrancePanel } from "./BudgetEncumbrancePanel";
import { BudgetApprovalPanel } from "./BudgetApprovalPanel";
import { BudgetAlertPanel } from "./BudgetAlertPanel";
import { BudgetPeriodLockPanel } from "./BudgetPeriodLockPanel";
import { BudgetRevisionPanel } from "./BudgetRevisionPanel";
import { BudgetScenarioSelector } from "./BudgetScenarioSelector";

const MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
];

const toAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

export default function BudgetDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccountItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Line editing
  const [showAddLine, setShowAddLine] = useState(true);
  const [newLine, setNewLine] = useState({
    account_id: "",
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    budgeted_amount: 0,
    category: "",
    notes: "",
    project_id: "",
  });

  // Dialogs
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [lineConsumptionOpen, setLineConsumptionOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<BudgetLine | null>(null);
  const [lineEncumbrances, setLineEncumbrances] = useState<Encumbrance[]>([]);
  const [lineActualConsumptions, setLineActualConsumptions] = useState<BudgetActualConsumption[]>([]);
  const [lineConsumptionLoading, setLineConsumptionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBudget();
      fetchLines();
      fetchAccounts();
      fetchProjects();
    }
  }, [id]);

  useEffect(() => {
    if (id && budget && budget.status !== "draft") {
      fetchComparison();
    }
  }, [id, budget?.status]);

  const fetchBudget = async () => {
    try {
      const response: any = await budgetsApi.getById(id!);
      if (response.success && response.data) {
        setBudget(response.data);
      } else {
        toast.error(t("budgets.errors.notFound", "Budget not found"));
        navigate("/budgets");
      }
    } catch (error) {
      console.error("[BudgetDetailPage] Failed to fetch budget:", error);
      toast.error(t("budgets.errors.fetchFailed", "Failed to load budget"));
      navigate("/budgets");
    } finally {
      setLoading(false);
    }
  };

  const fetchLines = async () => {
    try {
      const response: any = await budgetsApi.getLines(id!);
      if (response.success) {
        setLines(response.data || []);
      }
    } catch (error) {
      console.error("[BudgetDetailPage] Failed to fetch lines:", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response: any = await chartOfAccountsApi.getAll({ isActive: true });
      if (response.success) {
        setAccounts(response.data || []);
      }
    } catch (error) {
      console.error("[BudgetDetailPage] Failed to fetch accounts:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response: any = await projectsApi.getAll({ is_active: "true" });
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (error) {
      console.error("[BudgetDetailPage] Failed to fetch projects:", error);
    }
  };

  const fetchComparison = async () => {
    try {
      const response: any = await budgetsApi.getComparison(id!);
      if (response.success) {
        setComparison(response.data);
      }
    } catch (error) {
      console.error("[BudgetDetailPage] Failed to fetch comparison:", error);
    }
  };

  const handleAddLine = async () => {
    if (!newLine.account_id || newLine.budgeted_amount <= 0) {
      toast.error(
        t(
          "budgets.errors.lineRequired",
          "Please select an account and enter an amount",
        ),
      );
      return;
    }
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.upsertLines(id!, [newLine]);
      if (response.success) {
        toast.success(
          t("budgets.success.lineAdded", "Line added successfully"),
        );
        setNewLine({
          account_id: "",
          period_month: new Date().getMonth() + 1,
          period_year: new Date().getFullYear(),
          budgeted_amount: 0,
          category: "",
          notes: "",
          project_id: "",
        });
        fetchLines();
        fetchBudget();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          t("budgets.errors.lineAddFailed", "Failed to add line"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openLineConsumption = async (line: BudgetLine) => {
    setSelectedLine(line);
    setLineConsumptionOpen(true);
    setLineConsumptionLoading(true);

    try {
      const [encumbrancesResponse, actualsResponse]: any = await Promise.all([
        budgetsApi.getEncumbrances(id!, {
          budget_line_id: line._id,
        }),
        budgetsApi.getActualConsumptions(id!, {
          budget_line_id: line._id,
        }),
      ]);
      if (encumbrancesResponse.success) {
        setLineEncumbrances(encumbrancesResponse.data || []);
      }
      if (actualsResponse.success) {
        setLineActualConsumptions(actualsResponse.data || []);
      }
    } catch (error) {
      console.error("[BudgetDetailPage] Failed to fetch line consumption:", error);
      toast.error("Failed to load line consumption details");
      setLineEncumbrances([]);
      setLineActualConsumptions([]);
    } finally {
      setLineConsumptionLoading(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.approve(id!);
      if (response.success) {
        toast.success(t("budgets.success.approved", "Budget approved"));
        setApproveOpen(false);
        fetchBudget();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          t("budgets.errors.approveFailed", "Failed to approve"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.reject(id!, rejectReason);
      if (response.success) {
        toast.success(t("budgets.success.rejected", "Budget rejected"));
        setRejectOpen(false);
        setRejectReason("");
        fetchBudget();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          t("budgets.errors.rejectFailed", "Failed to reject"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLock = async () => {
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.lock(id!);
      if (response.success) {
        toast.success(t("budgets.success.locked", "Budget locked"));
        setLockOpen(false);
        fetchBudget();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          t("budgets.errors.lockFailed", "Failed to lock budget"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlock = async () => {
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.unlock(id!);
      if (response.success) {
        toast.success(t("budgets.success.unlocked", "Budget unlocked"));
        setUnlockOpen(false);
        fetchBudget();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          t("budgets.errors.unlockFailed", "Failed to unlock budget"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.close(id!, closeNotes);
      if (response.success) {
        toast.success(t("budgets.success.closed", "Budget closed"));
        setCloseOpen(false);
        setCloseNotes("");
        fetchBudget();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          t("budgets.errors.closeFailed", "Failed to close"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Centralized currency formatter
  const formatCurrency = useFormatCurrency();

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
      rejected: { variant: "destructive", className: "" },
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
      revenue: { className: "bg-emerald-100 text-emerald-800" },
      expense: { className: "bg-red-100 text-red-800" },
      profit: { className: "bg-blue-100 text-blue-800" },
      opex: { className: "bg-amber-100 text-amber-800" },
      capex: { className: "bg-violet-100 text-violet-800" },
      project: { className: "bg-cyan-100 text-cyan-800" },
    };
    const { className } = config[type] || config.expense;
    return (
      <Badge variant="outline" className={className}>
        {t(`budgets.types.${type}`, type)}
      </Badge>
    );
  };

  const getAccountName = (account_id: any) => {
    if (typeof account_id === "object" && account_id?.name) {
      return `${account_id.code || ""} - ${account_id.name}`;
    }
    const acc = accounts.find((a) => a._id === account_id);
    return acc ? `${acc.code} - ${acc.name}` : account_id || "-";
  };

  const getProjectMeta = (project: BudgetLine["project_id"], wbsCode?: string) => {
    if (project && typeof project === "object") {
      return {
        id: project._id,
        label: `${project.wbs_code || wbsCode || project.project_code} - ${project.name}`,
        code: project.wbs_code || wbsCode || project.project_code,
      };
    }

    const projectId = typeof project === "string" ? project : "";
    const matched = projects.find((p) => p._id === projectId);
    return {
      id: projectId,
      label: matched ? `${matched.wbs_code} - ${matched.name}` : wbsCode || projectId,
      code: wbsCode || matched?.wbs_code || projectId,
    };
  };

  const totalBudgeted = lines.reduce(
    (sum, l) => sum + toAmount(l.budgeted_amount),
    0,
  );
  const totalCommitted = lines.reduce(
    (sum, l) => sum + toAmount(l.encumbered_amount),
    0,
  );
  const totalActualConsumed = lines.reduce(
    (sum, l) => sum + toAmount(l.actual_amount),
    0,
  );
  const totalAvailable = lines.reduce(
    (sum, l) => sum + (toAmount(l.budgeted_amount) - toAmount(l.encumbered_amount) - toAmount(l.actual_amount)),
    0,
  );
  const linkedProjectLines = lines.filter((line) => Boolean(line.project_id)).length;
  const headerBudgetAmount =
    budget?.amount && Number(budget.amount) > 0 ? Number(budget.amount) : totalBudgeted;
  const getLineAvailable = (line: BudgetLine) =>
    toAmount(line.budgeted_amount) - toAmount(line.encumbered_amount) - toAmount(line.actual_amount);

  const getLineUtilization = (line: BudgetLine) => {
    const budgeted = toAmount(line.budgeted_amount);
    if (!budgeted) return 0;
    return ((toAmount(line.encumbered_amount) + toAmount(line.actual_amount)) / budgeted) * 100;
  };

  const lineComparisonItems = lines.reduce<Record<string, {
    category: string;
    budgetedAmount: number;
    actualAmount: number;
    variance: number;
    utilizationPercent: number;
  }>>((groups, line) => {
    const category =
      line.category ||
      (typeof line.account_id === "object"
        ? line.account_id.name
        : getAccountName(line.account_id)) ||
      "Uncategorized";
    const current = groups[category] || {
      category,
      budgetedAmount: 0,
      actualAmount: 0,
      variance: 0,
      utilizationPercent: 0,
    };
    current.budgetedAmount += toAmount(line.budgeted_amount);
    current.actualAmount += toAmount(line.actual_amount);
    current.variance = current.budgetedAmount - current.actualAmount;
    current.utilizationPercent = current.budgetedAmount
      ? (current.actualAmount / current.budgetedAmount) * 100
      : 0;
    groups[category] = current;
    return groups;
  }, {});

  const comparisonBudgeted = toAmount(comparison?.summary?.budgetedAmount) || totalBudgeted;
  const comparisonActual = totalActualConsumed || toAmount(comparison?.summary?.actualAmount);
  const comparisonVariance = comparisonBudgeted - comparisonActual;
  const comparisonUtilization = comparisonBudgeted
    ? (comparisonActual / comparisonBudgeted) * 100
    : 0;
  const comparisonItems =
    comparison?.itemComparisons && comparison.itemComparisons.length > 0
      ? comparison.itemComparisons.map((item: any) => {
          const category = item.category || item.description || "Uncategorized";
          const liveItem = lineComparisonItems[category];
          const budgetedAmount = toAmount(item.budgetedAmount) || liveItem?.budgetedAmount || 0;
          const actualAmount = liveItem?.actualAmount ?? toAmount(item.actualAmount);
          return {
            ...item,
            category,
            budgetedAmount,
            actualAmount,
            variance: budgetedAmount - actualAmount,
            utilizationPercent: budgetedAmount ? (actualAmount / budgetedAmount) * 100 : 0,
          };
        })
      : Object.values(lineComparisonItems);

  const getLineStatus = (line: BudgetLine) => {
    const available = getLineAvailable(line);
    const utilization = getLineUtilization(line);

    if (available < 0 || utilization > 100) {
      return {
        label: "Over budget",
        className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
        icon: AlertTriangle,
      };
    }

    if (utilization >= 85) {
      return {
        label: "Near limit",
        className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
        icon: Gauge,
      };
    }

    return {
      label: "On track",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
      icon: CheckCircle2,
    };
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
          <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] px-4 py-5 sm:px-6 lg:px-8">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
            <Skeleton className="mt-6 h-10 w-full rounded-lg" />
            <Skeleton className="mt-4 h-96 w-full rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!budget) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Hero Header */}
        <div className="relative overflow-hidden border-b border-slate-800 bg-slate-950">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
          <div className="relative mx-auto max-w-[1600px] 2xl:max-w-[2200px] px-4 py-7 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/budgets")}
                  className="mt-1 h-9 w-9 shrink-0 rounded-lg p-0 text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="max-w-5xl text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
                      {budget.name}
                    </h1>
                    {getStatusBadge(budget.status)}
                    {getTypeBadge(budget.type)}
                    {budget.code ? (
                      <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                        {budget.code}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                    {budget.description || t("budgets.noDescription", "No description")}
                  </p>
                  {budget.purpose ? (
                    <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
                      {budget.purpose}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Landmark className="h-3.5 w-3.5" />
                      {t("budgets.fiscalYear", "FY")}: {budget.fiscal_year || "-"}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {budget.periodStart ? formatDate(budget.periodStart) : "-"} — {budget.periodEnd ? formatDate(budget.periodEnd) : "-"}
                    </span>
                    {budget.scenario_name && (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        {budget.scenario_name}
                      </span>
                    )}
                    {budget.base_currency ? (
                      <span className="flex items-center gap-1">
                        <CircleDollarSign className="h-3.5 w-3.5" />
                        {budget.base_currency} {budget.exchange_rate_type ? `(${budget.exchange_rate_type})` : ""}
                      </span>
                    ) : null}
                    {budget.owner_id && typeof budget.owner_id === "object" ? (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {budget.owner_id.name}
                      </span>
                    ) : null}
                  </div>
                  {Array.isArray(budget.tags) && budget.tags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {budget.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="border-white/15 bg-white/5 text-[11px] text-slate-200">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
                <BudgetScenarioSelector
                  budgetId={id!}
                  budgetName={budget.name}
                  currentScenario={{
                    scenario_type: budget.scenario_type,
                    scenario_name: budget.scenario_name,
                    is_primary_scenario: budget.is_primary_scenario
                  }}
                  onScenarioChange={(scenario) => navigate(`/budgets/${scenario._id}`)}
                  onRefresh={() => { fetchBudget(); fetchLines(); }}
                />
                {budget.status === "draft" && (
                  <>
                    <Button variant="outline" onClick={() => navigate(`/budgets/${id}/edit`)} className="gap-2 rounded-lg border-white/15 bg-white/5 text-white hover:bg-white/15 hover:text-white">
                      <Pencil className="h-4 w-4" />
                      {t("common.edit", "Edit")}
                    </Button>
                    <Button onClick={() => setApproveOpen(true)} className="gap-2 rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-950/30 hover:bg-emerald-500">
                      <CheckCircle className="h-4 w-4" />
                      {t("budgets.approve", "Approve")}
                    </Button>
                  </>
                )}
                {(budget.status === "draft" || budget.status === "approved") && (
                  <Button variant="outline" onClick={() => setRejectOpen(true)} className="gap-2 rounded-lg border-white/15 bg-white/5 text-white hover:bg-white/15 hover:text-white">
                    <XCircle className="h-4 w-4" />
                    {t("budgets.reject", "Reject")}
                  </Button>
                )}
                {budget.status === "approved" && (
                  <Button variant="outline" onClick={() => setLockOpen(true)} className="gap-2 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20">
                    <Lock className="h-4 w-4" />
                    {t("budgets.lock", "Lock")}
                  </Button>
                )}
                {budget.status === "locked" && (
                  <Button variant="outline" onClick={() => setUnlockOpen(true)} className="gap-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20">
                    <Unlock className="h-4 w-4" />
                    {t("budgets.unlock", "Unlock")}
                  </Button>
                )}
                {(budget.status === "approved" || budget.status === "locked") && (
                  <Button variant="outline" onClick={() => setCloseOpen(true)} className="gap-2 rounded-lg border-white/15 bg-white/5 text-white hover:bg-white/15 hover:text-white">
                    <Power className="h-4 w-4" />
                    {t("budgets.close", "Close")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] px-4 py-6 sm:px-6 lg:px-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Budget Amount */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.budgetAmount", "Budget Amount")}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{formatCurrency(headerBudgetAmount)}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatCurrency(totalBudgeted)} {t("budgets.allocated", "allocated")}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                    <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{t("budgets.utilization", "Utilization")}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{comparisonUtilization.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(comparisonUtilization, 100)} className="mt-1.5 h-1.5" />
                </div>
              </CardContent>
            </Card>

            {/* Actual Spent */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.totalActual", "Actual Spent")}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{formatCurrency(totalActualConsumed)}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      {totalActualConsumed <= totalBudgeted ? (
                        <>
                          <TrendingDown className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totalBudgeted - totalActualConsumed)} {t("budgets.underBudget", "under budget")}</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-3 w-3 text-red-600 dark:text-red-400" />
                          <span className="text-red-600 dark:text-red-400">{formatCurrency(totalActualConsumed - totalBudgeted)} {t("budgets.overBudget", "over budget")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                    <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.available", "Available")}</p>
                    <p className={`mt-1 text-2xl font-bold tracking-tight ${totalAvailable < 0 ? "text-red-600 dark:text-red-400" : "text-slate-950 dark:text-white"}`}>
                      {formatCurrency(totalAvailable)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatCurrency(totalCommitted)} {t("budgets.committed", "committed")}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${totalAvailable < 0 ? "bg-red-50 dark:bg-red-950/50" : "bg-emerald-50 dark:bg-emerald-950/50"}`}>
                    <Wallet className={`h-5 w-5 ${totalAvailable < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lines & Coverage */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.lines", "Budget Lines")}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{lines.length}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{linkedProjectLines} {t("budgets.linkedToProjects", "linked to projects")}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
                    <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-slate-50 p-2 text-center dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("budgets.onTrack", "On track")}</p>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {lines.filter((l) => getLineUtilization(l) < 85 && getLineAvailable(l) >= 0).length}
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2 text-center dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("budgets.atRisk", "At risk")}</p>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {lines.filter((l) => getLineAvailable(l) < 0 || getLineUtilization(l) >= 85).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Tabs */}
        <Tabs defaultValue="lines" className="mt-6 space-y-5">
          <TabsList className="w-full flex-wrap justify-start gap-1 border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900/50">
            <TabsTrigger value="lines" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-slate-100 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
              <FolderTree className="h-3.5 w-3.5" />
              {t("budgets.budgetLines", "Budget Lines")}
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-slate-100 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
              <BarChart3 className="h-3.5 w-3.5" />
              {t("budgets.comparison", "Budget vs Actual")}
            </TabsTrigger>
            <TabsTrigger value="transfers" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-slate-100 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              {t("budgets.transfers", "Transfers")}
            </TabsTrigger>
            <TabsTrigger value="encumbrances" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-slate-100 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
              <LockIcon className="h-3.5 w-3.5" />
              {t("budgets.encumbrances", "Encumbrances")}
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-slate-100 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
              <CheckCircle className="h-3.5 w-3.5" />
              {t("budgets.approvals", "Approvals")}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-slate-100 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
              <Bell className="h-3.5 w-3.5" />
              {t("budgets.alerts", "Alerts")}
            </TabsTrigger>
            <TabsTrigger value="periods" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-slate-100 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("budgets.periods", "Period Locks")}
            </TabsTrigger>
            <TabsTrigger value="revisions" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-slate-100 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
              <History className="h-3.5 w-3.5" />
              {t("budgets.revisions", "Revisions")}
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-slate-100 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
              <FileText className="h-3.5 w-3.5" />
              {t("budgets.details", "Details")}
            </TabsTrigger>
          </TabsList>

          {/* Budget Lines Tab */}
          <TabsContent value="lines" className="space-y-5">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold dark:text-white">{t("budgets.budgetLines", "Budget Lines")}</CardTitle>
                      <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 text-xs dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <Link2 className="h-3 w-3" />
                        Project / WBS ready
                      </Badge>
                    </div>
                    <CardDescription className="text-xs sm:text-sm">
                      Assign each budget line to a general ledger account and, where needed, link it to a project or WBS node for operational tracking.
                    </CardDescription>
                  </div>
                  {budget.status === "draft" && (
                    <Button variant="outline" size="sm" onClick={() => setShowAddLine(!showAddLine)} className="shrink-0 gap-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                      <Plus className="h-4 w-4" />
                      {showAddLine ? "Hide entry panel" : "Add budget line"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {/* Sub-metrics */}
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                      <FolderTree className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Budget lines</p>
                      <p className="text-lg font-bold text-slate-950 dark:text-white">{lines.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
                      <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Linked to projects</p>
                      <p className="text-lg font-bold text-slate-950 dark:text-white">{linkedProjectLines}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      <Layers className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Unassigned lines</p>
                      <p className="text-lg font-bold text-slate-950 dark:text-white">{Math.max(0, lines.length - linkedProjectLines)}</p>
                    </div>
                  </div>
                </div>

                {/* Financial summary */}
                <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.budgeted", "Budgeted")}</p>
                    <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{formatCurrency(totalBudgeted)}</p>
                    <div className="mt-2 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-1 rounded-full bg-indigo-500" style={{ width: "100%" }}></div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.openCommitted", "Open Committed")}</p>
                    <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{formatCurrency(totalCommitted)}</p>
                    <div className="mt-2 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-1 rounded-full bg-amber-500" style={{ width: `${headerBudgetAmount > 0 ? Math.min((totalCommitted / headerBudgetAmount) * 100, 100) : 0}%` }}></div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.actualConsumed", "Actual Consumed")}</p>
                    <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{formatCurrency(totalActualConsumed)}</p>
                    <div className="mt-2 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-1 rounded-full bg-blue-500" style={{ width: `${headerBudgetAmount > 0 ? Math.min((totalActualConsumed / headerBudgetAmount) * 100, 100) : 0}%` }}></div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.available", "Available")}</p>
                    <p className={`mt-1 text-xl font-bold ${totalAvailable < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {formatCurrency(totalAvailable)}
                    </p>
                    <div className="mt-2 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-1 rounded-full ${totalAvailable < 0 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${headerBudgetAmount > 0 ? Math.min((Math.max(totalAvailable, 0) / headerBudgetAmount) * 100, 100) : 0}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Add Line Form */}
                {showAddLine && budget.status === "draft" && (
                  <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15">
                              <FolderTree className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                            </div>
                            Budget line allocation
                          </div>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Create a line and optionally link it to a project or WBS node so budget, actual, and encumbrance reporting stay aligned.
                          </p>
                        </div>
                        <Badge variant="outline" className="w-fit border-indigo-200 bg-indigo-50 text-xs text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-500/10 dark:text-indigo-200">
                          Draft entry
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-6 xl:grid-cols-12">
                      <div className="md:col-span-3 xl:col-span-3">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("budgets.account", "Account")} *
                        </Label>
                        <Select
                          value={newLine.account_id}
                          onValueChange={(value) =>
                            setNewLine({ ...newLine, account_id: value })
                          }
                        >
                          <SelectTrigger className="mt-1.5 h-11">
                            <SelectValue
                              placeholder={t(
                                "budgets.selectAccount",
                                "Select account",
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((acc) => (
                              <SelectItem key={acc._id} value={acc._id}>
                                {acc.code} - {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-3 xl:col-span-4">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Allocation Scope: Project / WBS
                          </Label>
                        </div>
                        <p className="mt-1 min-h-5 text-xs text-slate-500 dark:text-slate-400">
                          Leave blank only when this line is shared.
                        </p>
                        <Select
                          value={newLine.project_id || "__none__"}
                          onValueChange={(value) =>
                            setNewLine({
                              ...newLine,
                              project_id: value === "__none__" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger className="mt-1.5 h-11">
                            <SelectValue
                              placeholder={t(
                                "projects.selectProject",
                                "Select project (optional)",
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              Unassigned / shared budget
                            </SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p._id} value={p._id}>
                                <span className="font-mono text-xs">{p.wbs_code}</span> {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 xl:col-span-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Category
                        </Label>
                        <Input
                          className="mt-1.5 h-11"
                          value={newLine.category}
                          onChange={(e) =>
                            setNewLine({
                              ...newLine,
                              category: e.target.value,
                            })
                          }
                          placeholder="Payroll"
                        />
                      </div>
                      <div className="md:col-span-2 xl:col-span-1">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("budgets.month", "Month")}
                        </Label>
                        <Select
                          value={newLine.period_month.toString()}
                          onValueChange={(value) =>
                            setNewLine({
                              ...newLine,
                              period_month: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger className="mt-1.5 h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m) => (
                              <SelectItem
                                key={m.value}
                                value={m.value.toString()}
                              >
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 xl:col-span-1">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("budgets.year", "Year")}
                        </Label>
                        <Input
                          className="mt-1.5 h-11"
                          type="number"
                          value={newLine.period_year}
                          onChange={(e) =>
                            setNewLine({
                              ...newLine,
                              period_year:
                                parseInt(e.target.value) ||
                                new Date().getFullYear(),
                            })
                          }
                        />
                      </div>
                      <div className="md:col-span-3 xl:col-span-1">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("budgets.amount", "Amount")} *
                        </Label>
                        <Input
                          className="mt-1.5 h-11"
                          type="number"
                          step="0.01"
                          value={newLine.budgeted_amount || ""}
                          onChange={(e) =>
                            setNewLine({
                              ...newLine,
                              budgeted_amount: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="md:col-span-3 xl:col-span-6">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Notes
                        </Label>
                        <Input
                          className="mt-1.5 h-11"
                          value={newLine.notes}
                          onChange={(e) =>
                            setNewLine({
                              ...newLine,
                              notes: e.target.value,
                            })
                          }
                          placeholder="Planning assumption or cost driver"
                        />
                      </div>
                      <div className="flex items-end justify-end gap-2 md:col-span-3 xl:col-span-6">
                        <Button
                          className="h-11 gap-2 rounded-lg bg-slate-950 px-5 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                          onClick={handleAddLine}
                          disabled={submitting}
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          Save line
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 rounded-lg"
                          onClick={() => setShowAddLine(false)}
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="sr-only">Close allocation form</span>
                        </Button>
                      </div>
                    </div>
                    <div className="hidden">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <FolderTree className="h-4 w-4 text-indigo-600" />
                          Budget line allocation
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Create a line and optionally link it to a project or WBS node so budget, actual, and encumbrance reporting stay aligned.
                        </p>
                      </div>
                    </div>
                    <div className="hidden">
                      <div className="md:col-span-2">
                        <Label className="text-xs">
                          {t("budgets.account", "Account")} *
                        </Label>
                        <Select
                          value={newLine.account_id}
                          onValueChange={(value) =>
                            setNewLine({ ...newLine, account_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                "budgets.selectAccount",
                                "Select account",
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((acc) => (
                              <SelectItem key={acc._id} value={acc._id}>
                                {acc.code} - {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">
                          Allocation Scope: Project / WBS
                        </Label>
                        <p className="mb-2 text-xs text-muted-foreground">
                          Leave blank only when this line is not tied to a specific project.
                        </p>
                        <Select
                          value={newLine.project_id || "__none__"}
                          onValueChange={(value) =>
                            setNewLine({
                              ...newLine,
                              project_id: value === "__none__" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                "projects.selectProject",
                                "Select project (optional)",
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              Unassigned / shared budget
                            </SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p._id} value={p._id}>
                                <span className="font-mono text-xs">{p.wbs_code}</span> {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">
                          Category
                        </Label>
                        <Input
                          value={newLine.category}
                          onChange={(e) =>
                            setNewLine({
                              ...newLine,
                              category: e.target.value,
                            })
                          }
                          placeholder="Payroll"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">
                          {t("budgets.month", "Month")}
                        </Label>
                        <Select
                          value={newLine.period_month.toString()}
                          onValueChange={(value) =>
                            setNewLine({
                              ...newLine,
                              period_month: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m) => (
                              <SelectItem
                                key={m.value}
                                value={m.value.toString()}
                              >
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">
                          {t("budgets.year", "Year")}
                        </Label>
                        <Input
                          type="number"
                          value={newLine.period_year}
                          onChange={(e) =>
                            setNewLine({
                              ...newLine,
                              period_year:
                                parseInt(e.target.value) ||
                                new Date().getFullYear(),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">
                          {t("budgets.amount", "Amount")} *
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newLine.budgeted_amount || ""}
                          onChange={(e) =>
                            setNewLine({
                              ...newLine,
                              budgeted_amount: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">
                          Notes
                        </Label>
                        <Input
                          value={newLine.notes}
                          onChange={(e) =>
                            setNewLine({
                              ...newLine,
                              notes: e.target.value,
                            })
                          }
                          placeholder="Planning assumption or cost driver"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <Button
                          size="sm"
                          onClick={handleAddLine}
                          disabled={submitting}
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          <span className="ml-2">Save line</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddLine(false)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {lines.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertCircle className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("budgets.noLines", "No line items yet")}</p>
                    {budget.status === "draft" && (
                      <Button variant="outline" size="sm" className="mt-3 gap-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => setShowAddLine(true)}>
                        <Plus className="h-4 w-4" />
                        {t("budgets.addFirstLine", "Add First Line")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.account", "Account")}</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("projects.project", "Project")}</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.period", "Period")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.budgetedAmount", "Budgeted")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.committed", "Committed")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.actual", "Actual")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.available", "Available")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.utilization", "Use %")}</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.statusLabel", "Status")}</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.category", "Category")}</TableHead>
                          <TableHead className="w-[100px] text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("common.actions", "Actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line) => {
                          const util = getLineUtilization(line);
                          return (
                            <TableRow key={line._id} className="transition-colors hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/30">
                              <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{getAccountName(line.account_id)}</TableCell>
                              <TableCell>
                                {line.project_id ? (
                                  <span
                                    className="inline-flex cursor-pointer items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-mono text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
                                    onClick={() => { const projectMeta = getProjectMeta(line.project_id, line.wbs_code); if (projectMeta.id) navigate(`/projects/${projectMeta.id}`); }}
                                    title={getProjectMeta(line.project_id, line.wbs_code).label}
                                  >
                                    {getProjectMeta(line.project_id, line.wbs_code).code}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                                {`${MONTHS.find((m) => m.value === line.period_month)?.label || line.period_month} ${line.period_year}`}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(line.budgeted_amount)}</TableCell>
                              <TableCell className="text-right text-sm text-slate-600 dark:text-slate-300">{formatCurrency(line.encumbered_amount || 0)}</TableCell>
                              <TableCell className="text-right text-sm text-slate-600 dark:text-slate-300">{formatCurrency(line.actual_amount || 0)}</TableCell>
                              <TableCell className={`text-right text-sm font-medium ${getLineAvailable(line) < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {formatCurrency(getLineAvailable(line))}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-slate-600 dark:text-slate-300">{util.toFixed(1)}%</span>
                                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div className={`h-1.5 rounded-full ${util >= 85 ? "bg-red-500" : util >= 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(util, 100)}%` }}></div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const status = getLineStatus(line);
                                  const StatusIcon = status.icon;
                                  return (
                                    <Badge variant="outline" className={`gap-1 text-xs ${status.className}`}>
                                      <StatusIcon className="h-3 w-3" />
                                      {status.label}
                                    </Badge>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600 dark:text-slate-300">{line.category || "-"}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => openLineConsumption(line)} className="h-8 gap-1.5 px-2 text-xs dark:text-slate-300 dark:hover:bg-slate-800">
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-slate-50/70 font-semibold dark:bg-slate-900/50">
                          <TableCell colSpan={3} className="text-slate-900 dark:text-white">{t("budgets.total", "Total")}</TableCell>
                          <TableCell className="text-right text-slate-900 dark:text-white">{formatCurrency(totalBudgeted)}</TableCell>
                          <TableCell className="text-right text-slate-900 dark:text-white">{formatCurrency(totalCommitted)}</TableCell>
                          <TableCell className="text-right text-slate-900 dark:text-white">{formatCurrency(totalActualConsumed)}</TableCell>
                          <TableCell className={`text-right ${totalAvailable < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>{formatCurrency(totalAvailable)}</TableCell>
                          <TableCell className="text-right text-slate-900 dark:text-white">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs">{totalBudgeted > 0 ? (((totalCommitted + totalActualConsumed) / totalBudgeted) * 100).toFixed(1) : "0.0"}%</span>
                              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-1.5 rounded-full bg-slate-500" style={{ width: `${totalBudgeted > 0 ? Math.min(((totalCommitted + totalActualConsumed) / totalBudgeted) * 100, 100) : 0}%` }}></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-5">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                    <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold dark:text-white">{t("budgets.comparison", "Budget vs Actual")}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">{t("budgets.comparisonDescription", "Compare budgeted amounts against actual spending")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {comparison || lines.length > 0 ? (
                  <div className="space-y-5">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.totalBudgeted", "Total Budgeted")}</p>
                        <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(comparisonBudgeted)}</p>
                        <div className="mt-2 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                          <div className="h-1 rounded-full bg-indigo-500" style={{ width: "100%" }}></div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.totalActual", "Total Actual")}</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(comparisonActual)}</p>
                        <div className="mt-2 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                          <div className="h-1 rounded-full bg-blue-500" style={{ width: `${comparisonBudgeted > 0 ? Math.min((comparisonActual / comparisonBudgeted) * 100, 100) : 0}%` }}></div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.variance", "Variance")}</p>
                        <p className={`mt-1 text-2xl font-bold ${comparisonVariance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {formatCurrency(comparisonVariance)}
                        </p>
                        <div className="mt-2 flex items-center gap-1">
                          {comparisonVariance >= 0 ? (
                            <TrendingDown className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <TrendingUp className="h-3 w-3 text-red-600 dark:text-red-400" />
                          )}
                          <span className="text-xs text-slate-500 dark:text-slate-400">{comparisonUtilization.toFixed(1)}% {t("budgets.utilized", "utilized")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Item Comparison Table */}
                    {comparisonItems.length > 0 && (
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.category", "Category")}</TableHead>
                              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.budgeted", "Budgeted")}</TableHead>
                              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.actual", "Actual")}</TableHead>
                              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.variance", "Variance")}</TableHead>
                              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("budgets.utilization", "Utilization")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {comparisonItems.map((item: any, idx: number) => {
                              const util = item.utilizationPercent || 0;
                              return (
                                <TableRow key={idx} className="transition-colors hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/30">
                                  <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{item.category || item.description || `Item ${idx + 1}`}</TableCell>
                                  <TableCell className="text-right text-sm text-slate-600 dark:text-slate-300">{formatCurrency(item.budgetedAmount || 0)}</TableCell>
                                  <TableCell className="text-right text-sm text-slate-600 dark:text-slate-300">{formatCurrency(item.actualAmount || 0)}</TableCell>
                                  <TableCell className={`text-right text-sm font-medium ${(item.variance || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                    {formatCurrency(item.variance || 0)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <span className="text-xs text-slate-600 dark:text-slate-300">{item.utilizationPercent !== undefined ? `${item.utilizationPercent.toFixed(1)}%` : "-"}</span>
                                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div className={`h-1.5 rounded-full ${util >= 85 ? "bg-red-500" : util >= 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(util, 100)}%` }}></div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <BarChart3 className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("budgets.noComparisonData", "No comparison data available yet")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="info" className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                      <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <CardTitle className="text-base font-semibold dark:text-white">{t("budgets.budgetInfo", "Budget Information")}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3 dark:border-slate-800/60">
                    <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Target className="h-3.5 w-3.5" />{t("budgets.name", "Name")}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{budget.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3 dark:border-slate-800/60">
                    <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Layers className="h-3.5 w-3.5" />{t("budgets.type", "Type")}</span>
                    {getTypeBadge(budget.type)}
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3 dark:border-slate-800/60">
                    <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Landmark className="h-3.5 w-3.5" />{t("budgets.fiscalYear", "Fiscal Year")}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{budget.fiscal_year || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3 dark:border-slate-800/60">
                    <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><CalendarDays className="h-3.5 w-3.5" />{t("budgets.periodType", "Period Type")}</span>
                    <span className="text-sm capitalize text-slate-900 dark:text-white">{budget.periodType}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3 dark:border-slate-800/60">
                    <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><CircleDollarSign className="h-3.5 w-3.5" />{t("budgets.amount", "Amount")}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(Number(budget.amount || 0))}</span>
                  </div>
                  {budget.notes && (
                    <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-800/60">
                      <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><FileText className="h-3.5 w-3.5" />{t("budgets.notes", "Notes")}</span>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{budget.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                      <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <CardTitle className="text-base font-semibold dark:text-white">{t("budgets.auditInfo", "Audit Information")}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3 dark:border-slate-800/60">
                    <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><User className="h-3.5 w-3.5" />{t("budgets.createdBy", "Created By")}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{budget.createdBy?.name || budget.created_by?.name || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3 dark:border-slate-800/60">
                    <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><CalendarDays className="h-3.5 w-3.5" />{t("budgets.createdAt", "Created At")}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{budget.createdAt ? formatDate(budget.createdAt) : "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3 dark:border-slate-800/60">
                    <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Clock className="h-3.5 w-3.5" />{t("budgets.updatedAt", "Updated At")}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{budget.updatedAt ? formatDate(budget.updatedAt) : "-"}</span>
                  </div>
                  {budget.approvedBy?.name || budget.approved_by?.name ? (
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                      <span className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircle className="h-3.5 w-3.5" />{t("budgets.approvedBy", "Approved By")}</span>
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{budget.approvedBy?.name || budget.approved_by?.name}</span>
                    </div>
                  ) : null}
                  {budget.approvedAt || budget.approved_at ? (
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                      <span className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400"><CalendarDays className="h-3.5 w-3.5" />{t("budgets.approvedAt", "Approved At")}</span>
                      <span className="text-sm text-emerald-700 dark:text-emerald-400">{formatDate(budget.approvedAt || budget.approved_at || "")}</span>
                    </div>
                  ) : null}
                  {budget.rejectionReason && (
                    <div className="rounded-lg border border-red-100 bg-red-50/40 p-3 dark:border-red-900/30 dark:bg-red-950/20">
                      <span className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"><XCircle className="h-3.5 w-3.5" />{t("budgets.rejectionReason", "Rejection Reason")}</span>
                      <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{budget.rejectionReason}</p>
                    </div>
                  )}
                  {budget.locked_at && (
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-100 bg-amber-50/40 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                      <span className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400"><Lock className="h-3.5 w-3.5" />{t("budgets.lockedAt", "Locked At")}</span>
                      <span className="text-sm text-amber-700 dark:text-amber-400">{formatDate(budget.locked_at)}</span>
                    </div>
                  )}
                  {budget.closed_at && (
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3 dark:border-slate-800/60">
                      <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Power className="h-3.5 w-3.5" />{t("budgets.closedAt", "Closed At")}</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{formatDate(budget.closed_at)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transfers Tab */}
          <TabsContent value="transfers" className="space-y-5">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
                    <ArrowRightLeft className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t("budgets.transfers", "Budget Transfers")}</CardTitle>
                    <CardDescription className="text-xs">{t("budgets.transfersDescription", "Move funds between budget lines with proper authorization.")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <BudgetTransferPanel
                  budgetId={id!}
                  budgetLines={lines}
                  budgetStatus={budget.status}
                  canApprove={budget.status === "approved"}
                  canUpdate={budget.status === "draft" || budget.status === "approved"}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Encumbrances Tab */}
          <TabsContent value="encumbrances" className="space-y-5">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/50">
                    <Receipt className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t("budgets.encumbrances", "Encumbrances")}</CardTitle>
                    <CardDescription className="text-xs">{t("budgets.encumbrancesDescription", "Track committed expenses and obligations against the budget.")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <BudgetEncumbrancePanel
                  budgetId={id!}
                  budgetLines={lines}
                  budgetStatus={budget.status}
                  canUpdate={budget.status === "draft" || budget.status === "approved"}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="space-y-5">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t("budgets.approvals", "Approval Workflow")}</CardTitle>
                    <CardDescription className="text-xs">{t("budgets.approvalsDescription", "Manage review and approval stages for this budget.")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <BudgetApprovalPanel
                  budgetId={id!}
                  budgetStatus={budget.status}
                  budgetAmount={totalBudgeted}
                  departmentId={
                    typeof budget.department === "object"
                      ? budget.department?._id || null
                      : budget.department || null
                  }
                  onApprovalChange={fetchBudget}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-5">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/50">
                    <Bell className="h-4.5 w-4.5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t("budgets.alerts", "Budget Alerts")}</CardTitle>
                    <CardDescription className="text-xs">{t("budgets.alertsDescription", "Monitor threshold breaches and anomalous spending patterns.")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <BudgetAlertPanel budgetId={id!} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Period Locks Tab */}
          <TabsContent value="periods" className="space-y-5">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/50">
                    <LockIcon className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t("budgets.periodLocks", "Period Locks")}</CardTitle>
                    <CardDescription className="text-xs">{t("budgets.periodLocksDescription", "Control editing access by fiscal period to prevent unauthorized changes.")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <BudgetPeriodLockPanel budgetId={id!} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revisions Tab */}
          <TabsContent value="revisions" className="space-y-5">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-950/50">
                    <History className="h-4.5 w-4.5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t("budgets.revisions", "Budget Revisions")}</CardTitle>
                    <CardDescription className="text-xs">{t("budgets.revisionsDescription", "Review historical changes and amendment history for this budget.")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <BudgetRevisionPanel budgetId={id!} />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Approve Dialog */}
        <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("budgets.dialogs.approve.title", "Approve Budget")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "budgets.dialogs.approve.description",
                  "Are you sure you want to approve this budget?",
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={handleApprove} disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("budgets.approve", "Approve")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("budgets.dialogs.reject.title", "Reject Budget")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "budgets.dialogs.reject.description",
                  "Provide a reason for rejecting this budget.",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>{t("budgets.rejectReason", "Reason")}</Label>
              <Textarea
                className="mt-2"
                placeholder={t(
                  "budgets.rejectReasonPlaceholder",
                  "Reason for rejection",
                )}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
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
        <Dialog open={lockOpen} onOpenChange={setLockOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("budgets.dialogs.lock.title", "Lock Budget")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "budgets.dialogs.lock.description",
                  "Lock this budget to prevent further changes.",
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLockOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleLock}
                disabled={submitting}
                className="bg-amber-500 hover:bg-amber-600"
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
        <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("budgets.dialogs.unlock.title", "Unlock Budget")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "budgets.dialogs.unlock.description",
                  "Unlock this budget to allow modifications. The budget will return to approved status.",
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUnlockOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleUnlock}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
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
        <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("budgets.dialogs.close.title", "Close Budget")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "budgets.dialogs.close.description",
                  "Close this budget to finalize it.",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>{t("budgets.closeNotes", "Close Notes")}</Label>
              <Textarea
                className="mt-2"
                placeholder={t(
                  "budgets.closeNotesPlaceholder",
                  "Optional closing notes",
                )}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloseOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={handleClose} disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("budgets.close", "Close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      <Dialog open={lineConsumptionOpen} onOpenChange={setLineConsumptionOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-7xl overflow-hidden border-slate-800 bg-slate-950 p-0 text-slate-100 shadow-2xl sm:rounded-xl">
          <div className="border-b border-slate-800 bg-slate-950 px-5 py-5 sm:px-6">
            <DialogHeader className="pr-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 ring-1 ring-indigo-400/30">
                  <Receipt className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold text-white">
                    Budget line consumption
                  </DialogTitle>
                  <DialogDescription className="mt-1 max-w-3xl text-sm text-slate-400">
                    Review commitments, actuals, and remaining availability for the selected budget line.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {selectedLine && (
            <div className="max-h-[calc(92vh-158px)] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(150px,0.8fr)_minmax(300px,1.7fr)_minmax(220px,1.2fr)_minmax(240px,1.3fr)]">
                <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Account</div>
                  <div className="mt-2 break-words text-sm font-semibold leading-6 text-white">{getAccountName(selectedLine.account_id)}</div>
                </div>
                <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Project / WBS</div>
                  <div className="mt-2 break-words text-sm font-semibold leading-6 text-white">
                    {selectedLine.project_id ? getProjectMeta(selectedLine.project_id, selectedLine.wbs_code).label : "Unassigned / shared budget"}
                  </div>
                </div>
                <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Budgeted</div>
                  <div className="mt-2 whitespace-nowrap text-2xl font-bold text-white">{formatCurrency(selectedLine.budgeted_amount)}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, Math.max(0, getLineUtilization(selectedLine)))}%` }}
                    />
                  </div>
                </div>
                <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Available</div>
                  <div className="mt-2 whitespace-nowrap text-2xl font-bold text-emerald-300">{formatCurrency(getLineAvailable(selectedLine))}</div>
                  <div className="mt-1 text-xs text-slate-400">Actual {formatCurrency(selectedLine.actual_amount || 0)}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="text-xs text-slate-400">Committed</div>
                  <div className="mt-1 whitespace-nowrap text-lg font-semibold text-amber-300">{formatCurrency(selectedLine.encumbered_amount || 0)}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="text-xs text-slate-400">Utilization</div>
                  <div className="mt-1 text-lg font-semibold text-indigo-300">{getLineUtilization(selectedLine).toFixed(1)}%</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="text-xs text-slate-400">Documents</div>
                  <div className="mt-1 text-lg font-semibold text-white">{lineEncumbrances.length + lineActualConsumptions.length}</div>
                </div>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-2">
                <Card className="overflow-hidden border-slate-800 bg-slate-950 shadow-none">
                  <CardHeader className="border-b border-slate-800 bg-slate-900/50 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-400/25">
                        <Receipt className="h-4 w-4 text-amber-300" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-white">Commitments</CardTitle>
                        <CardDescription className="text-xs text-slate-400">Encumbrances raised against this budget line.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {lineConsumptionLoading ? (
                      <div className="flex items-center justify-center py-14 text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : lineEncumbrances.length === 0 ? (
                      <div className="px-5 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 ring-1 ring-slate-800">
                          <Receipt className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="mt-3 text-sm font-medium text-slate-200">No commitments posted</div>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                          Encumbrances from purchase orders, GRNs, expenses, or manual commitments will appear here.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="min-w-[220px] text-xs uppercase text-slate-500">Source</TableHead>
                            <TableHead className="text-xs uppercase text-slate-500">Status</TableHead>
                            <TableHead className="text-right text-xs uppercase text-slate-500">Encumbered</TableHead>
                            <TableHead className="text-right text-xs uppercase text-slate-500">Remaining</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineEncumbrances.map((encumbrance) => (
                            <TableRow key={encumbrance._id} className="border-slate-800 hover:bg-slate-900/60">
                              <TableCell className="align-top">
                                <div className="font-medium text-white">{encumbrance.source_number}</div>
                                <div className="mt-1 max-w-[340px] whitespace-normal text-xs leading-5 text-slate-400">
                                  {encumbrance.source_type.replaceAll("_", " ")} • {encumbrance.description}
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                <Badge variant="outline" className="border-amber-400/30 bg-amber-500/10 text-amber-200">{encumbrance.status.replaceAll("_", " ")}</Badge>
                              </TableCell>
                              <TableCell className="text-right align-top font-medium text-slate-100">{formatCurrency(encumbrance.encumbered_amount)}</TableCell>
                              <TableCell className="text-right align-top font-medium text-emerald-300">{formatCurrency(encumbrance.remaining_amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-slate-800 bg-slate-950 shadow-none">
                  <CardHeader className="border-b border-slate-800 bg-slate-900/50 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/25">
                        <Receipt className="h-4 w-4 text-emerald-300" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-white">Actual consumption</CardTitle>
                        <CardDescription className="text-xs text-slate-400">Liquidation documents that converted commitments into actual spend.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {lineConsumptionLoading ? (
                      <div className="flex items-center justify-center py-14 text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : lineActualConsumptions.length === 0 ? (
                      <div className="px-5 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 ring-1 ring-slate-800">
                          <Receipt className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="mt-3 text-sm font-medium text-slate-200">No actuals posted</div>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                          Liquidations and direct actual documents linked to this budget line will appear here.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="min-w-[220px] text-xs uppercase text-slate-500">Document</TableHead>
                            <TableHead className="text-xs uppercase text-slate-500">Date</TableHead>
                            <TableHead className="text-xs uppercase text-slate-500">Origin</TableHead>
                            <TableHead className="text-right text-xs uppercase text-slate-500">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineActualConsumptions.map((consumption) => (
                            <TableRow key={consumption._id} className="border-slate-800 hover:bg-slate-900/60">
                              <TableCell className="align-top">
                                <div className="font-medium text-white">{consumption.document_number}</div>
                                <div className="mt-1 text-xs text-slate-400">
                                  {consumption.document_type.replaceAll("_", " ")}
                                  {consumption.source_number ? ` • from ${consumption.source_number}` : ""}
                                </div>
                                {consumption.notes ? (
                                  <div className="mt-1 text-xs text-slate-500">{consumption.notes}</div>
                                ) : null}
                              </TableCell>
                              <TableCell className="align-top text-slate-300">{formatDate(consumption.document_date)}</TableCell>
                              <TableCell className="align-top">
                                <Badge variant="outline" className="border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
                                  {consumption.origin_type === "direct_actual" ? "Direct actual" : "Encumbrance liquidation"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right align-top font-medium text-slate-100">{formatCurrency(consumption.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-800 bg-slate-950 px-5 py-4 sm:px-6">
            <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-white" onClick={() => setLineConsumptionOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      </div>
    </Layout>
  );
}
