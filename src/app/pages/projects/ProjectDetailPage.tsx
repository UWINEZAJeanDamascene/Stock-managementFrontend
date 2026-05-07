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
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  on_hold: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/projects")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back", "Back")}
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <Badge
                  variant="outline"
                  className={STATUS_COLORS[project.status] || ""}
                >
                  {project.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-mono">{project.wbs_code}</span> · {project.project_code}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/projects/${project._id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            {t("projects.edit", "Edit")}
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t("projects.budgetAllocated", "Budget Allocated")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(allocatedAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                {t("projects.totalSpent", "Spent")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{formatCurrency(spentAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4 text-green-500" />
                {t("projects.remaining", "Remaining")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(remainingAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t("projects.progress", "Progress")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressPercent.toFixed(1)}%</div>
              <Progress value={progressPercent} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("projects.basicInfo", "Project Details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("projects.type", "Type")}</span>
                  <p className="font-medium capitalize">{project.type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("projects.priority", "Priority")}</span>
                  <p className="font-medium capitalize">{project.priority}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("projects.billingType", "Billing Type")}</span>
                  <p className="font-medium capitalize">{project.billing_type?.replace("_", " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("projects.contractValue", "Contract Value")}</span>
                  <p className="font-medium">{formatCurrency(project.contract_value || 0)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("projects.startDate", "Start Date")}</span>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {project.start_date ? new Date(project.start_date).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("projects.endDate", "End Date")}</span>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {project.end_date ? new Date(project.end_date).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
              {project.description && (
                <div>
                  <span className="text-muted-foreground">{t("projects.description", "Description")}</span>
                  <p className="text-sm mt-1">{project.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("projects.budgetSummary", "Budget Summary")}</CardTitle>
            </CardHeader>
            <CardContent>
              {budgetSummary ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("projects.budgetAllocated", "Budget Allocated")}</span>
                    <span className="font-medium">{formatCurrency(allocatedAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("budgets.actual", "Actual")}</span>
                    <span className="font-medium text-red-500">{formatCurrency(spentAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("budgets.encumbered", "Open Encumbered")}</span>
                    <span className="font-medium text-orange-500">{formatCurrency(encumberedAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm font-medium">{t("projects.remaining", "Remaining")}</span>
                    <span className="font-bold text-green-500">
                      {formatCurrency(remainingAmount)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground text-center">
                    {budgetSummary.line_count} {t("projects.budgetLines", "budget line(s) linked")}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t("projects.noBudgetLines", "No budget lines linked to this project")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs for WBS and Budget Lines */}
        <Tabs defaultValue="wbs">
          <TabsList>
            <TabsTrigger value="wbs">{t("projects.wbsTree", "WBS Tree")}</TabsTrigger>
            <TabsTrigger value="budget">{t("projects.budgetLines", "Budget Lines")}</TabsTrigger>
          </TabsList>
          <TabsContent value="wbs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("projects.wbsTreeDesc", "Work Breakdown Structure")}</CardTitle>
                <CardDescription>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("projects.budgetLines", "Budget Lines")}</CardTitle>
              </CardHeader>
              <CardContent>
                {budgetSummary && budgetSummary.budget_lines.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("budgets.account", "Account")}</TableHead>
                        <TableHead>{t("budgets.month", "Month")}</TableHead>
                        <TableHead>{t("budgets.year", "Year")}</TableHead>
                        <TableHead className="text-right">{t("budgets.budgetedAmount", "Budgeted")}</TableHead>
                        <TableHead className="text-right">{t("budgets.actual", "Actual")}</TableHead>
                        <TableHead>{t("budgets.category", "Category")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgetSummary.budget_lines.map((line) => (
                        <TableRow key={line._id}>
                          <TableCell>
                            {typeof line.account_id === "object"
                              ? `${line.account_id.code} - ${line.account_id.name}`
                              : line.account_id}
                          </TableCell>
                          <TableCell>{line.period_month}</TableCell>
                          <TableCell>{line.period_year}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(line.budgeted_amount)}
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            {formatCurrency(line.actual_amount || 0)}
                          </TableCell>
                          <TableCell>{line.category || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("projects.noBudgetLines", "No budget lines linked to this project")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
