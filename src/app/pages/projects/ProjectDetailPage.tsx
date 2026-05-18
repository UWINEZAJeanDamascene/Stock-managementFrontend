import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { projectsApi, type Project, type ProjectBudgetSummary } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Skeleton } from "@/app/components/ui/skeleton";
import { toast } from "sonner";
import { Layout } from "@/app/layout/Layout";
import WBSTree from "./components/WBSTree";
import type { WBSTreeNode } from "./components/WBSTree";
import {
  ArrowLeft,
  Edit,
  Briefcase,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  FolderTree,
  RefreshCw,
} from "lucide-react";
import { useFormatCurrency } from '@/lib/currencyUtils';

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  on_hold: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
  completed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
};

const toAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

export default function ProjectDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [wbsTree, setWbsTree] = useState<WBSTreeNode[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<ProjectBudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchWBSTree();
      fetchBudgetSummary();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      const response: any = await projectsApi.getById(id!);
      if (response.success) {
        setProject(response.data);
      }
    } catch (error) {
      toast.error(t("projects.fetchError", "Failed to fetch project"));
    } finally {
      setLoading(false);
    }
  };

  const fetchWBSTree = async () => {
    try {
      const response: any = await projectsApi.getWBSTree(id!);
      if (response.success) {
        setWbsTree(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch WBS tree:", error);
    }
  };

  const fetchBudgetSummary = async () => {
    try {
      const response: any = await projectsApi.getBudgetSummary(id!);
      if (response.success) {
        setBudgetSummary(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch budget summary:", error);
    }
  };

  const formatCurrency = useFormatCurrency();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t("projects.noProjects", "Project not found")}</h2>
          <Button onClick={() => navigate("/projects")}>
            {t("common.back", "Back to Projects")}
          </Button>
        </div>
      </Layout>
    );
  }

  const allocatedAmount =
    toAmount(project.budget_allocated) ||
    toAmount(budgetSummary?.budget_summary?.total_budgeted);
  const spentAmount =
    toAmount(budgetSummary?.budget_summary?.total_actual) ||
    toAmount(project.budget_spent);
  const encumberedAmount = toAmount(budgetSummary?.budget_summary?.total_encumbered);
  const remainingAmount =
    budgetSummary
      ? allocatedAmount - spentAmount - encumberedAmount
      : toAmount(project.budget_remaining);
  const progressPercent = allocatedAmount > 0
    ? Math.min(100, (spentAmount / allocatedAmount) * 100)
    : toAmount(project.progress_percent);
  const displayedWbsTree: WBSTreeNode[] =
    wbsTree.length > 0
      ? wbsTree
      : [{ ...project, children: [] } as WBSTreeNode];

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/projects")}
                    className="h-9 gap-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("common.back", "Back")}
                  </Button>
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    {project.name}
                  </h1>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={STATUS_COLORS[project.status] || ""}>
                    {project.status}
                  </Badge>
                  <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                    {project.type}
                  </Badge>
                  <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                    {project.priority}
                  </Badge>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{project.wbs_code}</span> · {project.project_code}
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/projects/${project._id}/edit`)}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    <Edit className="h-4 w-4" />
                    {t("projects.edit", "Edit")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { fetchProject(); fetchWBSTree(); fetchBudgetSummary(); }}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t("common.refresh", "Refresh")}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Allocated</p>
                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{formatCurrency(allocatedAmount)}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Spent</p>
                  <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(spentAmount)}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Remaining</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(remainingAmount)}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Progress</p>
                  <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">{progressPercent.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-2">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-8 w-32" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-lg" />
                      </div>
                      <Skeleton className="mt-3 h-3 w-36" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("projects.budgetAllocated", "Budget Allocated")}
                        </p>
                        <p className="mt-3 truncate text-2xl font-bold text-slate-950 dark:text-white">
                          {formatCurrency(allocatedAmount)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                        <DollarSign className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Total approved budget
                    </p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("projects.totalSpent", "Spent")}
                        </p>
                        <p className="mt-3 truncate text-2xl font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(spentAmount)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-2.5 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60">
                        <TrendingDown className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Actual expenditure to date
                    </p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("projects.remaining", "Remaining")}
                        </p>
                        <p className={`mt-3 truncate text-2xl font-bold ${remainingAmount < 0 ? "text-red-600 dark:text-red-400" : "text-slate-950 dark:text-white"}`}>
                          {formatCurrency(remainingAmount)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-violet-50 p-2.5 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60">
                        <Wallet className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Available budget balance
                    </p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("projects.progress", "Progress")}
                        </p>
                        <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                          {progressPercent.toFixed(1)}%
                        </p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <Progress value={progressPercent} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="text-lg text-slate-950 dark:text-white">{t("projects.basicInfo", "Project Details")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">{t("projects.type", "Type")}</span>
                    <p className="mt-0.5 font-medium capitalize text-slate-950 dark:text-white">{project.type}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">{t("projects.priority", "Priority")}</span>
                    <p className="mt-0.5 font-medium capitalize text-slate-950 dark:text-white">{project.priority}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">{t("projects.billingType", "Billing Type")}</span>
                    <p className="mt-0.5 font-medium capitalize text-slate-950 dark:text-white">{project.billing_type?.replace("_", " ")}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">{t("projects.contractValue", "Contract Value")}</span>
                    <p className="mt-0.5 font-medium text-slate-950 dark:text-white">{formatCurrency(project.contract_value || 0)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">{t("projects.startDate", "Start Date")}</span>
                    <p className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-950 dark:text-white">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      {project.start_date ? new Date(project.start_date).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">{t("projects.endDate", "End Date")}</span>
                    <p className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-950 dark:text-white">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      {project.end_date ? new Date(project.end_date).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
                {project.description && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">{t("projects.description", "Description")}</span>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{project.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="text-lg text-slate-950 dark:text-white">{t("projects.budgetSummary", "Budget Summary")}</CardTitle>
              </CardHeader>
              <CardContent>
                {budgetSummary ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{t("projects.budgetAllocated", "Budget Allocated")}</span>
                      <span className="font-medium text-slate-950 dark:text-white">{formatCurrency(allocatedAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{t("budgets.actual", "Actual")}</span>
                      <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(spentAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{t("budgets.encumbered", "Open Encumbered")}</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(encumberedAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-950 dark:text-white">{t("projects.remaining", "Remaining")}</span>
                      <span className={`font-bold ${remainingAmount < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {formatCurrency(remainingAmount)}
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2 text-center text-xs text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                      {budgetSummary.line_count} {t("projects.budgetLines", "budget line(s) linked")}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                    {t("projects.noBudgetLines", "No budget lines linked to this project")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs for WBS and Budget Lines */}
          <Tabs defaultValue="wbs">
            <TabsList className="dark:border-slate-700 dark:bg-slate-900">
              <TabsTrigger value="wbs" className="data-[state=active]:bg-white data-[state=active]:text-slate-950 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
                <FolderTree className="mr-2 h-4 w-4" />
                {t("projects.wbsTree", "WBS Tree")}
              </TabsTrigger>
              <TabsTrigger value="budget" className="data-[state=active]:bg-white data-[state=active]:text-slate-950 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
                <DollarSign className="mr-2 h-4 w-4" />
                {t("projects.budgetLines", "Budget Lines")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="wbs" className="mt-4">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950 dark:text-white">{t("projects.wbsTreeDesc", "Work Breakdown Structure")}</CardTitle>
                  <CardDescription className="dark:text-slate-400">
                    Hierarchical view of project structure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WBSTree
                    nodes={displayedWbsTree}
                    onSelect={(node) => navigate(`/projects/${node._id}`)}
                    selectedId={project._id}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="budget" className="mt-4">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950 dark:text-white">{t("projects.budgetLines", "Budget Lines")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {budgetSummary && budgetSummary.budget_lines.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                            <TableHead className="text-slate-600 dark:text-slate-400">{t("budgets.account", "Account")}</TableHead>
                            <TableHead className="text-slate-600 dark:text-slate-400">{t("budgets.month", "Month")}</TableHead>
                            <TableHead className="text-slate-600 dark:text-slate-400">{t("budgets.year", "Year")}</TableHead>
                            <TableHead className="text-right text-slate-600 dark:text-slate-400">{t("budgets.budgetedAmount", "Budgeted")}</TableHead>
                            <TableHead className="text-right text-slate-600 dark:text-slate-400">{t("budgets.actual", "Actual")}</TableHead>
                            <TableHead className="text-slate-600 dark:text-slate-400">{t("budgets.category", "Category")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {budgetSummary.budget_lines.map((line) => (
                            <TableRow key={line._id} className="dark:border-slate-800">
                              <TableCell className="text-slate-950 dark:text-white">
                                {typeof line.account_id === "object"
                                  ? `${line.account_id.code} - ${line.account_id.name}`
                                  : line.account_id}
                              </TableCell>
                              <TableCell className="text-slate-950 dark:text-white">{line.period_month}</TableCell>
                              <TableCell className="text-slate-950 dark:text-white">{line.period_year}</TableCell>
                              <TableCell className="text-right font-medium text-slate-950 dark:text-white">
                                {formatCurrency(line.budgeted_amount)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                                {formatCurrency(line.actual_amount || 0)}
                              </TableCell>
                              <TableCell className="text-slate-950 dark:text-white">{line.category || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                      {t("projects.noBudgetLines", "No budget lines linked to this project")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
