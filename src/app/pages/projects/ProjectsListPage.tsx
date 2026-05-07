import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { projectsApi, type Project } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { toast } from "sonner";
import { Layout } from "@/app/layout/Layout";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  FolderTree,
  TrendingUp,
  Briefcase,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  on_hold: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

const TYPE_ICONS: Record<string, string> = {
  project: "Project",
  job: "Job",
  phase: "Phase",
  work_package: "Work Package",
  task: "Task",
};

const ALL_FILTER_VALUE = "__all__";

const toAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

export default function ProjectsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, typeFilter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const filters: Record<string, string> = {};
      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.type = typeFilter;

      const response: any = await projectsApi.getAll(filters);
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (error) {
      toast.error(t("projects.fetchError", "Failed to fetch projects"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("projects.confirmDelete", "Delete this project?"))) return;
    try {
      const response: any = await projectsApi.delete(id);
      if (response.success) {
        toast.success(t("projects.deleted", "Project deleted"));
        fetchProjects();
      }
    } catch (error: any) {
      toast.error(error?.message || t("projects.deleteError", "Failed to delete project"));
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      p.project_code.toLowerCase().includes(s) ||
      p.wbs_code.toLowerCase().includes(s)
    );
  });

  const totalBudget = filteredProjects.reduce((sum, p) => sum + toAmount(p.budget_allocated), 0);
  const totalSpent = filteredProjects.reduce((sum, p) => sum + toAmount(p.budget_spent), 0);
  const totalRemaining = totalBudget - totalSpent;

  const getProjectProgress = (project: Project) => {
    const budget = toAmount(project.budget_allocated);
    const spent = toAmount(project.budget_spent);
    if (budget > 0) {
      return Math.min(100, (spent / budget) * 100);
    }
    return toAmount(project.progress_percent);
  };

  const getStatusBadge = (status: string) => {
    const cls = STATUS_COLORS[status] || "bg-gray-500/10 text-gray-500";
    return (
      <Badge variant="outline" className={cls}>
        {t(`projects.statusValues.${status}`, status)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("projects.title", "Projects")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("projects.subtitle", "Manage projects and WBS structure")}
            </p>
          </div>
          <Button onClick={() => navigate("/projects/new")}>
            <Plus className="h-4 w-4 mr-2" />
            {t("projects.add", "Add Project")}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("projects.totalProjects", "Total Projects")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredProjects.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("projects.totalBudget", "Total Budget")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("projects.totalSpent", "Total Spent")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{formatCurrency(totalSpent)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("projects.remaining", "Remaining")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{formatCurrency(totalRemaining)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("projects.search", "Search projects...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter || ALL_FILTER_VALUE}
            onValueChange={(value) => setStatusFilter(value === ALL_FILTER_VALUE ? "" : value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("projects.filterStatus", "Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>{t("common.all", "All")}</SelectItem>
              <SelectItem value="planning">{t("projects.statusValues.planning", "Planning")}</SelectItem>
              <SelectItem value="active">{t("projects.statusValues.active", "Active")}</SelectItem>
              <SelectItem value="on_hold">{t("projects.statusValues.on_hold", "On Hold")}</SelectItem>
              <SelectItem value="completed">{t("projects.statusValues.completed", "Completed")}</SelectItem>
              <SelectItem value="cancelled">{t("projects.statusValues.cancelled", "Cancelled")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeFilter || ALL_FILTER_VALUE}
            onValueChange={(value) => setTypeFilter(value === ALL_FILTER_VALUE ? "" : value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("projects.filterType", "Type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>{t("common.all", "All")}</SelectItem>
              <SelectItem value="project">{t("projects.typeValues.project", "Project")}</SelectItem>
              <SelectItem value="job">{t("projects.typeValues.job", "Job")}</SelectItem>
              <SelectItem value="phase">{t("projects.typeValues.phase", "Phase")}</SelectItem>
              <SelectItem value="work_package">{t("projects.typeValues.work_package", "Work Package")}</SelectItem>
              <SelectItem value="task">{t("projects.typeValues.task", "Task")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{t("projects.wbsCode", "WBS Code")}</TableHead>
                <TableHead>{t("projects.name", "Name")}</TableHead>
                <TableHead>{t("projects.type", "Type")}</TableHead>
                <TableHead>{t("projects.status", "Status")}</TableHead>
                <TableHead className="text-right">{t("projects.budget", "Budget")}</TableHead>
                <TableHead className="text-right">{t("projects.spent", "Spent")}</TableHead>
                <TableHead className="text-right">{t("projects.progress", "Progress")}</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t("common.loading", "Loading...")}
                  </TableCell>
                </TableRow>
              ) : filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t("projects.noProjects", "No projects found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
                  <TableRow
                    key={project._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/projects/${project._id}`)}
                  >
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{project.wbs_code}</span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-xs text-muted-foreground">{project.project_code}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t(`projects.typeValues.${project.type}`, TYPE_ICONS[project.type] || project.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(project.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(toAmount(project.budget_allocated))}
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      {formatCurrency(toAmount(project.budget_spent))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{getProjectProgress(project).toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project._id}`); }}>
                            <Briefcase className="h-4 w-4 mr-2" />
                            {t("projects.view", "View Details")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project._id}/edit`); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t("projects.edit", "Edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project._id}/wbs`); }}>
                            <FolderTree className="h-4 w-4 mr-2" />
                            {t("projects.wbsTree", "WBS Tree")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={(e) => { e.stopPropagation(); handleDelete(project._id); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("projects.delete", "Delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
