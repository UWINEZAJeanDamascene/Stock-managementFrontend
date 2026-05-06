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
  DollarSign,
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
} from "lucide-react";
import { toast } from "sonner";

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
    (sum, l) => sum + (l.budgeted_amount || 0),
    0,
  );
  const totalCommitted = lines.reduce(
    (sum, l) => sum + (l.encumbered_amount || 0),
    0,
  );
  const totalActualConsumed = lines.reduce(
    (sum, l) => sum + (l.actual_amount || 0),
    0,
  );
  const totalAvailable = lines.reduce(
    (sum, l) => sum + ((l.budgeted_amount || 0) - (l.encumbered_amount || 0) - (l.actual_amount || 0)),
    0,
  );
  const linkedProjectLines = lines.filter((line) => Boolean(line.project_id)).length;
  const headerBudgetAmount =
    budget?.amount && Number(budget.amount) > 0 ? Number(budget.amount) : totalBudgeted;
  const getLineAvailable = (line: BudgetLine) =>
    (line.budgeted_amount || 0) - (line.encumbered_amount || 0) - (line.actual_amount || 0);

  const getLineUtilization = (line: BudgetLine) => {
    const budgeted = line.budgeted_amount || 0;
    if (!budgeted) return 0;
    return (((line.encumbered_amount || 0) + (line.actual_amount || 0)) / budgeted) * 100;
  };

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
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!budget) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/budgets")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{budget.name}</h1>
              {getStatusBadge(budget.status)}
              {getTypeBadge(budget.type)}
            </div>
            <p className="text-muted-foreground mt-1">
              {budget.description ||
                t("budgets.noDescription", "No description")}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {/* Scenario Selector */}
            <BudgetScenarioSelector
              budgetId={id!}
              budgetName={budget.name}
              currentScenario={{
                scenario_type: budget.scenario_type,
                scenario_name: budget.scenario_name,
                is_primary_scenario: budget.is_primary_scenario
              }}
              onScenarioChange={(scenario) => {
                // Navigate to the selected scenario
                navigate(`/budgets/${scenario._id}`);
              }}
              onRefresh={() => {
                fetchBudget();
                fetchLines();
              }}
            />

            {budget.status === "draft" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/budgets/${id}/edit`)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("common.edit", "Edit")}
                </Button>
                <Button onClick={() => setApproveOpen(true)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t("budgets.approve", "Approve")}
                </Button>
              </>
            )}
            {(budget.status === "draft" || budget.status === "approved") && (
              <Button variant="outline" onClick={() => setRejectOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                {t("budgets.reject", "Reject")}
              </Button>
            )}
            {budget.status === "approved" && (
              <Button
                variant="outline"
                onClick={() => setLockOpen(true)}
                className="bg-amber-50 hover:bg-amber-100"
              >
                <Lock className="mr-2 h-4 w-4" />
                {t("budgets.lock", "Lock")}
              </Button>
            )}
            {budget.status === "locked" && (
              <Button
                variant="outline"
                onClick={() => setUnlockOpen(true)}
                className="bg-green-50 hover:bg-green-100"
              >
                <Unlock className="mr-2 h-4 w-4" />
                {t("budgets.unlock", "Unlock")}
              </Button>
            )}
            {(budget.status === "approved" || budget.status === "locked") && (
              <Button variant="outline" onClick={() => setCloseOpen(true)}>
                <Power className="mr-2 h-4 w-4" />
                {t("budgets.close", "Close")}
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {t("budgets.fiscalYear", "Fiscal Year")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {budget.fiscal_year || "-"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                {budget.periodType}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                {t("budgets.budgetAmount", "Budget Amount")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(headerBudgetAmount)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Controlled total across all allocation lines
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                {t("budgets.lines", "Lines")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lines.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(totalBudgeted)}{" "}
                {t("budgets.allocated", "allocated")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {t("budgets.period", "Period")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {budget.periodStart ? formatDate(budget.periodStart) : "-"}
                {" to "}
                {budget.periodEnd ? formatDate(budget.periodEnd) : "-"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="lines" className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="lines">
              {t("budgets.budgetLines", "Budget Lines")}
            </TabsTrigger>
            <TabsTrigger value="comparison">
              {t("budgets.comparison", "Budget vs Actual")}
            </TabsTrigger>
            <TabsTrigger value="transfers">
              <ArrowRightLeft className="h-4 w-4 mr-1" />
              {t("budgets.transfers", "Transfers")}
            </TabsTrigger>
            <TabsTrigger value="encumbrances">
              <LockIcon className="h-4 w-4 mr-1" />
              {t("budgets.encumbrances", "Encumbrances")}
            </TabsTrigger>
            <TabsTrigger value="approvals">
              <CheckCircle className="h-4 w-4 mr-1" />
              {t("budgets.approvals", "Approvals")}
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <Bell className="h-4 w-4 mr-1" />
              {t("budgets.alerts", "Alerts")}
            </TabsTrigger>
            <TabsTrigger value="periods">
              <CalendarDays className="h-4 w-4 mr-1" />
              {t("budgets.periods", "Period Locks")}
            </TabsTrigger>
            <TabsTrigger value="revisions">
              <History className="h-4 w-4 mr-1" />
              {t("budgets.revisions", "Revisions")}
            </TabsTrigger>
            <TabsTrigger value="info">
              {t("budgets.details", "Details")}
            </TabsTrigger>
          </TabsList>

          {/* Budget Lines Tab */}
          <TabsContent value="lines">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle>
                      {t("budgets.budgetLines", "Budget Lines")}
                    </CardTitle>
                    <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                      <Link2 className="h-3 w-3" />
                      Project / WBS ready
                    </Badge>
                  </div>
                  <CardDescription>
                    Assign each budget line to a general ledger account and, where needed, link it to a project or WBS node for operational tracking.
                  </CardDescription>
                </div>
                {budget.status === "draft" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddLine(!showAddLine)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {showAddLine ? "Hide entry panel" : "Add budget line"}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs uppercase text-slate-500">Budget lines</div>
                    <div className="mt-1 text-2xl font-semibold">{lines.length}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs uppercase text-slate-500">Linked to projects</div>
                    <div className="mt-1 text-2xl font-semibold">{linkedProjectLines}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs uppercase text-slate-500">Unassigned lines</div>
                    <div className="mt-1 text-2xl font-semibold">{Math.max(0, lines.length - linkedProjectLines)}</div>
                  </div>
                </div>

                <div className="mb-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs uppercase text-slate-500">Budgeted</div>
                    <div className="mt-1 text-xl font-semibold">{formatCurrency(totalBudgeted)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs uppercase text-slate-500">Committed</div>
                    <div className="mt-1 text-xl font-semibold">{formatCurrency(totalCommitted)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs uppercase text-slate-500">Actual</div>
                    <div className="mt-1 text-xl font-semibold">{formatCurrency(totalActualConsumed)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs uppercase text-slate-500">Available</div>
                    <div className={`mt-1 text-xl font-semibold ${totalAvailable < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatCurrency(totalAvailable)}
                    </div>
                  </div>
                </div>

                {/* Add Line Form */}
                {showAddLine && budget.status === "draft" && (
                  <div className="mb-4 rounded-lg border border-slate-200 bg-muted/30 p-4 dark:border-slate-800">
                    <div className="mb-4 flex items-start justify-between gap-4">
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
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-8">
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
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {t("budgets.noLines", "No line items yet")}
                    </p>
                    {budget.status === "draft" && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setShowAddLine(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t("budgets.addFirstLine", "Add First Line")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("budgets.account", "Account")}</TableHead>
                        <TableHead>{t("projects.project", "Project")}</TableHead>
                        <TableHead>{t("budgets.period", "Period")}</TableHead>
                        <TableHead>{t("budgets.month", "Month")}</TableHead>
                        <TableHead>{t("budgets.year", "Year")}</TableHead>
                        <TableHead className="text-right">
                          {t("budgets.budgetedAmount", "Budgeted")}
                        </TableHead>
                        <TableHead className="text-right">Committed</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">Use %</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>
                          {t("budgets.category", "Category")}
                        </TableHead>
                        <TableHead>{t("budgets.notes", "Notes")}</TableHead>
                        <TableHead className="text-right">Consumption</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line) => (
                        <TableRow key={line._id}>
                          <TableCell className="font-medium">
                            {getAccountName(line.account_id)}
                          </TableCell>
                          <TableCell>
                            {line.project_id ? (
                              <span
                                className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/20"
                                onClick={() => {
                                  const projectMeta = getProjectMeta(line.project_id, line.wbs_code);
                                  if (projectMeta.id) navigate(`/projects/${projectMeta.id}`);
                                }}
                                title={getProjectMeta(line.project_id, line.wbs_code).label}
                              >
                                {getProjectMeta(line.project_id, line.wbs_code).code}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {`${MONTHS.find((m) => m.value === line.period_month)?.label || line.period_month} ${line.period_year}`}
                          </TableCell>
                          <TableCell>
                            {MONTHS.find((m) => m.value === line.period_month)
                              ?.label || line.period_month}
                          </TableCell>
                          <TableCell>{line.period_year}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(line.budgeted_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(line.encumbered_amount || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(line.actual_amount || 0)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${getLineAvailable(line) < 0 ? "text-red-600" : "text-emerald-600"}`}>
                            {formatCurrency(getLineAvailable(line))}
                          </TableCell>
                          <TableCell className="text-right">
                            {getLineUtilization(line).toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const status = getLineStatus(line);
                              const StatusIcon = status.icon;
                              return (
                                <Badge variant="outline" className={`gap-1 ${status.className}`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {status.label}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell>{line.category || "-"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {line.notes || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openLineConsumption(line)}
                              className="h-8 px-2"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={5} className="font-semibold">
                          {t("budgets.total", "Total")}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(totalBudgeted)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(totalCommitted)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(totalActualConsumed)}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${totalAvailable < 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {formatCurrency(totalAvailable)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {totalBudgeted > 0 ? (((totalCommitted + totalActualConsumed) / totalBudgeted) * 100).toFixed(1) : "0.0"}%
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell colSpan={2}></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("budgets.comparison", "Budget vs Actual")}
                </CardTitle>
                <CardDescription>
                  {t(
                    "budgets.comparisonDescription",
                    "Compare budgeted amounts against actual spending",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comparison ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-sm text-muted-foreground">
                            {t("budgets.totalBudgeted", "Total Budgeted")}
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(
                              comparison.summary?.budgetedAmount || 0,
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-sm text-muted-foreground">
                            {t("budgets.totalActual", "Total Actual")}
                          </div>
                          <div className="text-2xl font-bold">
                            {formatCurrency(
                              comparison.summary?.actualAmount || 0,
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-sm text-muted-foreground">
                            {t("budgets.variance", "Variance")}
                          </div>
                          <div
                            className={`text-2xl font-bold ${(comparison.summary?.varianceAmount || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {formatCurrency(
                              comparison.summary?.varianceAmount || 0,
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {(comparison.summary?.varianceAmount || 0) >= 0 ? (
                              <TrendingDown className="h-3 w-3 text-green-600" />
                            ) : (
                              <TrendingUp className="h-3 w-3 text-red-600" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {(
                                comparison.summary?.variancePercent || 0
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Item Comparison Table */}
                    {comparison.itemComparisons &&
                      comparison.itemComparisons.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>
                                {t("budgets.category", "Category")}
                              </TableHead>
                              <TableHead className="text-right">
                                {t("budgets.budgeted", "Budgeted")}
                              </TableHead>
                              <TableHead className="text-right">
                                {t("budgets.actual", "Actual")}
                              </TableHead>
                              <TableHead className="text-right">
                                {t("budgets.variance", "Variance")}
                              </TableHead>
                              <TableHead className="text-right">
                                {t("budgets.utilization", "Utilization")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {comparison.itemComparisons.map(
                              (item: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">
                                    {item.category ||
                                      item.description ||
                                      `Item ${idx + 1}`}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(item.budgetedAmount || 0)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(item.actualAmount || 0)}
                                  </TableCell>
                                  <TableCell
                                    className={`text-right font-medium ${(item.variance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                                  >
                                    {formatCurrency(item.variance || 0)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.variancePercent !== undefined
                                      ? `${item.variancePercent.toFixed(1)}%`
                                      : "-"}
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                      )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p>
                      {t(
                        "budgets.noComparisonData",
                        "No comparison data available yet",
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("budgets.budgetInfo", "Budget Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("budgets.name", "Name")}
                    </span>
                    <span className="font-medium">{budget.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("budgets.type", "Type")}
                    </span>
                    {getTypeBadge(budget.type)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("budgets.fiscalYear", "Fiscal Year")}
                    </span>
                    <span className="font-medium">
                      {budget.fiscal_year || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("budgets.periodType", "Period Type")}
                    </span>
                    <span className="capitalize">{budget.periodType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("budgets.amount", "Amount")}
                    </span>
                    <span className="font-medium">
                          {formatCurrency(Number(budget.amount || 0))}
                    </span>
                  </div>
                  {budget.notes && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("budgets.notes", "Notes")}
                      </span>
                      <span className="text-sm max-w-[200px] text-right">
                        {budget.notes}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("budgets.auditInfo", "Audit Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("budgets.createdBy", "Created By")}
                    </span>
                    <span className="font-medium">
                      {budget.createdBy?.name || budget.created_by?.name || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("budgets.createdAt", "Created At")}
                    </span>
                    <span>
                      {budget.createdAt ? formatDate(budget.createdAt) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("budgets.updatedAt", "Updated At")}
                    </span>
                    <span>
                      {budget.updatedAt ? formatDate(budget.updatedAt) : "-"}
                    </span>
                  </div>
                  {budget.approvedBy?.name || budget.approved_by?.name ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("budgets.approvedBy", "Approved By")}
                      </span>
                      <span className="font-medium text-green-600">
                        {budget.approvedBy?.name || budget.approved_by?.name}
                      </span>
                    </div>
                  ) : null}
                  {budget.approvedAt || budget.approved_at ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("budgets.approvedAt", "Approved At")}
                      </span>
                      <span>
                        {formatDate(
                          budget.approvedAt || budget.approved_at || "",
                        )}
                      </span>
                    </div>
                  ) : null}
                  {budget.rejectionReason && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("budgets.rejectionReason", "Rejection Reason")}
                      </span>
                      <span className="text-red-600 text-sm max-w-[200px] text-right">
                        {budget.rejectionReason}
                      </span>
                    </div>
                  )}
                  {budget.locked_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("budgets.lockedAt", "Locked At")}
                      </span>
                      <span>{formatDate(budget.locked_at)}</span>
                    </div>
                  )}
                  {budget.closed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("budgets.closedAt", "Closed At")}
                      </span>
                      <span>{formatDate(budget.closed_at)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transfers Tab */}
          <TabsContent value="transfers">
            <BudgetTransferPanel
              budgetId={id!}
              budgetLines={lines}
              budgetStatus={budget.status}
              canApprove={budget.status === "approved"}
              canUpdate={budget.status === "draft" || budget.status === "approved"}
            />
          </TabsContent>

          {/* Encumbrances Tab */}
          <TabsContent value="encumbrances">
            <BudgetEncumbrancePanel
              budgetId={id!}
              budgetLines={lines}
              budgetStatus={budget.status}
              canUpdate={budget.status === "draft" || budget.status === "approved"}
            />
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <BudgetApprovalPanel
              budgetId={id!}
              budgetStatus={budget.status}
              onApprovalChange={fetchBudget}
            />
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <BudgetAlertPanel budgetId={id!} />
          </TabsContent>

          {/* Period Locks Tab */}
          <TabsContent value="periods">
            <BudgetPeriodLockPanel budgetId={id!} />
          </TabsContent>

          {/* Revisions Tab */}
          <TabsContent value="revisions">
            <BudgetRevisionPanel budgetId={id!} />
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
      </div>

      <Dialog open={lineConsumptionOpen} onOpenChange={setLineConsumptionOpen}>
        <DialogContent className="max-h-[85vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Budget line consumption</DialogTitle>
            <DialogDescription>
              Review commitments and liquidation documents that consumed this budget line.
            </DialogDescription>
          </DialogHeader>

          {selectedLine && (
            <div className="space-y-6">
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-lg border p-3">
                  <div className="text-xs uppercase text-muted-foreground">Account</div>
                  <div className="mt-1 text-sm font-medium">{getAccountName(selectedLine.account_id)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs uppercase text-muted-foreground">Project / WBS</div>
                  <div className="mt-1 text-sm font-medium">
                    {selectedLine.project_id ? getProjectMeta(selectedLine.project_id, selectedLine.wbs_code).label : "Unassigned"}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs uppercase text-muted-foreground">Budgeted</div>
                  <div className="mt-1 text-sm font-semibold">{formatCurrency(selectedLine.budgeted_amount)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs uppercase text-muted-foreground">Committed</div>
                  <div className="mt-1 text-sm font-semibold">{formatCurrency(selectedLine.encumbered_amount || 0)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs uppercase text-muted-foreground">Actual / Available</div>
                  <div className="mt-1 text-sm font-semibold">
                    {formatCurrency(selectedLine.actual_amount || 0)} / {formatCurrency(getLineAvailable(selectedLine))}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Commitments</CardTitle>
                    <CardDescription>Encumbrances raised against this budget line.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {lineConsumptionLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : lineEncumbrances.length === 0 ? (
                      <div className="py-8 text-sm text-muted-foreground">No encumbrances have been posted to this line.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Source</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Encumbered</TableHead>
                            <TableHead className="text-right">Remaining</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineEncumbrances.map((encumbrance) => (
                            <TableRow key={encumbrance._id}>
                              <TableCell>
                                <div className="font-medium">{encumbrance.source_number}</div>
                                <div className="text-xs text-muted-foreground">
                                  {encumbrance.source_type.replaceAll("_", " ")} • {encumbrance.description}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{encumbrance.status.replaceAll("_", " ")}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(encumbrance.encumbered_amount)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(encumbrance.remaining_amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Receipt className="h-4 w-4" />
                      Actual consumption
                    </CardTitle>
                    <CardDescription>Liquidation documents that converted commitments into actual spend.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {lineConsumptionLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : lineActualConsumptions.length === 0 ? (
                      <div className="py-8 text-sm text-muted-foreground">
                        No actual consumption documents are linked to this line yet.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Document</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Origin</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineActualConsumptions.map((consumption) => (
                            <TableRow key={consumption._id}>
                              <TableCell>
                                <div className="font-medium">{consumption.document_number}</div>
                                <div className="text-xs text-muted-foreground">
                                  {consumption.document_type.replaceAll("_", " ")}
                                  {consumption.source_number ? ` • from ${consumption.source_number}` : ""}
                                </div>
                                {consumption.notes ? (
                                  <div className="text-xs text-muted-foreground">{consumption.notes}</div>
                                ) : null}
                              </TableCell>
                              <TableCell>{formatDate(consumption.document_date)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {consumption.origin_type === "direct_actual" ? "Direct actual" : "Encumbrance liquidation"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(consumption.amount)}</TableCell>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setLineConsumptionOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
