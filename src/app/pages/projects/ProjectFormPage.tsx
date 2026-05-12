import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { projectsApi, type Project, type ProjectCreateRequest } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  FolderTree,
  ShieldCheck,
} from "lucide-react";
import { Layout } from "@/app/layout/Layout";

const PROJECT_TYPES = [
  { value: "project", label: "Project" },
  { value: "job", label: "Job" },
  { value: "phase", label: "Phase" },
  { value: "work_package", label: "Work Package" },
  { value: "task", label: "Task" },
];

const PROJECT_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const BILLING_TYPES = [
  { value: "fixed_price", label: "Fixed Price" },
  { value: "time_material", label: "Time & Material" },
  { value: "cost_plus", label: "Cost Plus" },
  { value: "none", label: "None" },
];

export default function ProjectFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState<ProjectCreateRequest>({
    project_code: "",
    name: "",
    description: "",
    parent_id: "",
    type: "project",
    status: "planning",
    priority: "medium",
    budget_allocated: 0,
    start_date: "",
    end_date: "",
    billing_type: "none",
    contract_value: 0,
  });

  const formatCurrency = (amount?: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  useEffect(() => {
    fetchProjects();
    if (isEditing && id) {
      fetchProject();
    }
  }, [id]);

  const fetchProjects = async () => {
    try {
      const response: any = await projectsApi.getAll({ status: "active" });
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const fetchProject = async () => {
    try {
      const response: any = await projectsApi.getById(id!);
      if (response.success && response.data) {
        const p = response.data;
        setFormData({
          project_code: p.project_code,
          name: p.name,
          description: p.description || "",
          parent_id: p.parent_id ? (typeof p.parent_id === "string" ? p.parent_id : p.parent_id._id) : "",
          type: p.type,
          status: p.status,
          priority: p.priority,
          budget_allocated: p.budget_allocated,
          start_date: p.start_date ? p.start_date.split("T")[0] : "",
          end_date: p.end_date ? p.end_date.split("T")[0] : "",
          billing_type: p.billing_type,
          contract_value: p.contract_value,
        });
      }
    } catch (error) {
      toast.error(t("projects.fetchError", "Failed to fetch project"));
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_code || !formData.name) {
      toast.error(t("projects.codeNameRequired", "Project code and name are required"));
      return;
    }

    setSaving(true);
    try {
      const dataToSubmit = {
        ...formData,
        parent_id: formData.parent_id || undefined,
      };

      const response: any = isEditing
        ? await projectsApi.update(id!, dataToSubmit)
        : await projectsApi.create(dataToSubmit);

      if (response.success) {
        toast.success(
          isEditing
            ? t("projects.updated", "Project updated successfully")
            : t("projects.created", "Project created successfully")
        );
        navigate("/projects");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          t("projects.saveError", "Failed to save project")
      );
    } finally {
      setSaving(false);
    }
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

  const selectedParent = projects.find((project) => project._id === formData.parent_id);
  const projectedMargin = (formData.contract_value || 0) - (formData.budget_allocated || 0);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl 2xl:max-w-[2200px] space-y-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/projects")} className="mt-1 h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-indigo-600 text-white">
                  <Briefcase className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">
                  {isEditing
                    ? t("projects.edit", "Edit Project")
                    : t("projects.add", "Create Project")}
                </h1>
              </div>
              <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Register project governance, WBS ownership, budget controls, dates, and billing rules in one structured record.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => navigate("/projects")} type="button">
              {t("common.cancel", "Cancel")}
            </Button>
            <Button form="project-form" type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing
                ? t("common.save", "Save Changes")
                : t("common.create", "Create Project")}
            </Button>
          </div>
        </div>

        <form id="project-form" onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
          {/* Basic Info */}
          <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-indigo-600" />
                {t("projects.basicInfo", "Project Identity")}
              </CardTitle>
              <CardDescription>
                {t("projects.basicInfoDesc", "Define the master project record used by budgets, WBS, and reporting.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project_code">
                    {t("projects.projectCode", "Project Code")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="project_code"
                    value={formData.project_code}
                    onChange={(e) =>
                      setFormData({ ...formData, project_code: e.target.value.toUpperCase() })
                    }
                    placeholder={t("projects.codePlaceholder", "e.g., PRJ-2024-001")}
                    disabled={isEditing}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {t("projects.name", "Name")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t("projects.namePlaceholder", "e.g., Kigali Distribution Center Phase 1")}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("projects.description", "Description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t("projects.descriptionPlaceholder", "Optional description")}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("projects.type", "Type")}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("projects.status", "Status")}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("projects.priority", "Priority")}</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("projects.parentProject", "Parent Project (Optional)")}</Label>
                <Select
                  value={formData.parent_id || "__none__"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      parent_id: value === "__none__" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("projects.noParent", "No parent (top level)")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {t("projects.noParent", "No parent (top level)")}
                    </SelectItem>
                    {projects
                      .filter((p) => p._id !== id)
                      .map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          <span className="font-mono text-xs">{p.wbs_code}</span> {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Budget Info */}
          <Card className="border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                {t("projects.budgetInfo", "Commercial Controls")}
              </CardTitle>
              <CardDescription>
                Capture approved budget, contract value, and billing method for budget versus actual reporting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_allocated">{t("projects.budgetAllocated", "Budget Allocated")}</Label>
                  <Input
                    id="budget_allocated"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budget_allocated || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget_allocated: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract_value">{t("projects.contractValue", "Contract Value")}</Label>
                  <Input
                    id="contract_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.contract_value || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contract_value: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("projects.billingType", "Billing Type")}</Label>
                <Select
                  value={formData.billing_type}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, billing_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_TYPES.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                {t("projects.timeline", "Delivery Timeline")}
              </CardTitle>
              <CardDescription>
                Set planned start and finish dates for scheduling and progress review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">{t("projects.startDate", "Start Date")}</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">{t("projects.endDate", "End Date")}</Label>
                  <Input
                    id="end_date"
                    type="date"
                    min={formData.start_date || undefined}
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  Control Summary
                </CardTitle>
                <CardDescription>Live review before saving.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs font-medium uppercase text-slate-500">Project</div>
                  <div className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {formData.name || "Untitled project"}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    {formData.project_code || "PROJECT-CODE"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500">Status</div>
                    <div className="font-medium capitalize">{formData.status?.replace("_", " ")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Priority</div>
                    <div className="font-medium capitalize">{formData.priority}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Budget</div>
                    <div className="font-medium">{formatCurrency(formData.budget_allocated)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Contract</div>
                    <div className="font-medium">{formatCurrency(formData.contract_value)}</div>
                  </div>
                </div>
                <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
                    <FolderTree className="h-3.5 w-3.5" />
                    WBS Placement
                  </div>
                  <div className="mt-2 text-slate-900 dark:text-slate-100">
                    {selectedParent ? `${selectedParent.wbs_code} - ${selectedParent.name}` : "Top-level project"}
                  </div>
                </div>
                <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Projected margin</div>
                  <div className={`mt-1 text-lg font-semibold ${projectedMargin < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatCurrency(projectedMargin)}
                  </div>
                </div>
                <Button className="w-full" type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isEditing ? "Save project" : "Create project"}
                </Button>
              </CardContent>
            </Card>
          </aside>
        </form>
      </div>
    </Layout>
  );
}
