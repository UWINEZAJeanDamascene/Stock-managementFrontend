import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  budgetsApi,
  chartOfAccountsApi,
  ChartOfAccountItem,
  BudgetLine,
} from "@/lib/api";
import { Layout } from "../../layout/Layout";
import { ArrowLeft, Plus, Trash2, Loader2, Save } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
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

interface LineItem {
  account_id: string;
  period_month: number;
  period_year: number;
  budgeted_amount: number;
  category: string;
  notes: string;
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function BudgetFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<ChartOfAccountItem[]>([]);

  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "expense" as "revenue" | "expense" | "profit",
    fiscal_year: currentYear,
    periodStart: "",
    periodEnd: "",
    periodType: "yearly" as "monthly" | "quarterly" | "yearly" | "custom",
    amount: 0,
    notes: "",
  });

  const [lines, setLines] = useState<LineItem[]>([]);

  // Filter accounts based on budget type
  const filteredAccounts = accounts.filter((acc) => {
    if (form.type === "revenue") {
      return ["revenue", "income"].includes(acc.type?.toLowerCase());
    } else if (form.type === "expense") {
      return ["expense", "cogs"].includes(acc.type?.toLowerCase());
    }
    return true; // 'profit' or any other type shows all accounts
  });

  const fetchAccounts = useCallback(async () => {
    try {
      const response: any = await chartOfAccountsApi.getAll({ isActive: true });
      if (response.success) {
        setAccounts(response.data || []);
      }
    } catch (error) {
      console.error("[BudgetFormPage] Failed to fetch accounts:", error);
    }
  }, []);

  const fetchBudget = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response: any = await budgetsApi.getById(id);
      if (response.success) {
        const b = response.data;
        setForm({
          name: b.name || "",
          description: b.description || "",
          type: b.type || "expense",
          fiscal_year: b.fiscal_year || currentYear,
          periodStart: b.periodStart ? b.periodStart.split("T")[0] : "",
          periodEnd: b.periodEnd ? b.periodEnd.split("T")[0] : "",
          periodType: b.periodType || "yearly",
          amount: (b.amount as number) || 0,
          notes: b.notes || "",
        });

        // Fetch existing lines
        try {
          const linesResponse: any = await budgetsApi.getLines(id);
          if (linesResponse.success && linesResponse.data) {
            setLines(
              linesResponse.data.map((l: BudgetLine) => ({
                account_id:
                  typeof l.account_id === "object"
                    ? l.account_id._id
                    : l.account_id,
                period_month: l.period_month,
                period_year: l.period_year,
                budgeted_amount: l.budgeted_amount,
                category: l.category || "",
                notes: l.notes || "",
              })),
            );
          }
        } catch (lineError) {
          console.error("[BudgetFormPage] Failed to fetch lines:", lineError);
        }
      }
    } catch (error) {
      console.error("[BudgetFormPage] Failed to fetch budget:", error);
      toast.error(t("budgets.errors.fetchFailed", "Failed to load budget"));
    } finally {
      setLoading(false);
    }
  }, [id, currentYear, t]);

  useEffect(() => {
    fetchAccounts();
    if (isEdit) {
      fetchBudget();
    }
  }, [fetchAccounts, fetchBudget, isEdit]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        account_id: "",
        period_month: new Date().getMonth() + 1,
        period_year: form.fiscal_year,
        budgeted_amount: 0,
        category: "",
        notes: "",
      },
    ]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.fiscal_year) {
      toast.error(
        t("budgets.errors.nameRequired", "Name and fiscal year are required"),
      );
      return;
    }

    setSubmitting(true);
    try {
      let budgetId = id;

      if (isEdit) {
        const response: any = await budgetsApi.update(id!, {
          name: form.name,
          description: form.description,
          type: form.type,
          fiscal_year: form.fiscal_year,
          periodStart: form.periodStart || undefined,
          periodEnd: form.periodEnd || undefined,
          periodType: form.periodType,
          amount: form.amount,
          notes: form.notes,
        });
        if (!response.success) {
          throw new Error(response.error || "Failed to update budget");
        }
      } else {
        const response: any = await budgetsApi.create({
          name: form.name,
          description: form.description,
          type: form.type,
          fiscal_year: form.fiscal_year,
          periodStart: form.periodStart || undefined,
          periodEnd: form.periodEnd || undefined,
          periodType: form.periodType,
          amount: form.amount,
          notes: form.notes,
        });
        if (response.success) {
          budgetId = response.data._id;
        } else {
          throw new Error(response.error || "Failed to create budget");
        }
      }

      // Save lines if any
      if (lines.length > 0 && budgetId) {
        const validLines = lines.filter(
          (l) => l.account_id && l.budgeted_amount > 0,
        );
        if (validLines.length > 0) {
          try {
            await budgetsApi.upsertLines(
              budgetId,
              validLines.map((l) => ({
                account_id: l.account_id,
                category: l.category || undefined,
                period_month: l.period_month,
                period_year: l.period_year,
                budgeted_amount: l.budgeted_amount,
                notes: l.notes || undefined,
              })),
            );
          } catch (lineError) {
            console.error("[BudgetFormPage] Failed to save lines:", lineError);
            toast.error(
              t(
                "budgets.errors.linesSaveFailed",
                "Budget saved but some lines failed to save",
              ),
            );
          }
        }
      }

      toast.success(
        isEdit
          ? t("budgets.messages.updated", "Budget updated successfully")
          : t("budgets.messages.created", "Budget created successfully"),
      );
      navigate("/budgets");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          t("budgets.errors.saveFailed", "Failed to save budget"),
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

  const totalLineAmount = lines.reduce(
    (sum, l) => sum + (l.budgeted_amount || 0),
    0,
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin dark:text-slate-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/budgets")}
            className="dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold dark:text-white">
              {isEdit
                ? t("budgets.editBudget", "Edit Budget")
                : t("budgets.addBudget", "Add Budget")}
            </h1>
            <p className="text-muted-foreground dark:text-slate-400">
              {isEdit
                ? t(
                    "budgets.editDescription",
                    "Update budget details and line items",
                  )
                : t(
                    "budgets.createDescription",
                    "Create a new budget for tracking",
                  )}
            </p>
          </div>
        </div>

        {/* Basic Info */}
        <Card className="mb-6 dark:bg-slate-800 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="dark:text-white">{t("budgets.basicInfo", "Basic Information")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label className="dark:text-slate-200">{t("budgets.nameLabel", "Budget Name")} *</Label>
                <Input
                  placeholder={t(
                    "budgets.namePlaceholder",
                    "e.g., Q1 Operating Budget",
                  )}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="dark:text-slate-200">{t("budgets.description", "Description")}</Label>
                <Input
                  placeholder={t(
                    "budgets.descriptionPlaceholder",
                    "Optional description",
                  )}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t("budgets.type", "Type")} *</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm({ ...form, type: value as any })
                  }
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
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
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t("budgets.fiscalYear", "Fiscal Year")} *</Label>
                <Input
                  type="number"
                  value={form.fiscal_year}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fiscal_year: parseInt(e.target.value) || currentYear,
                    })
                  }
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t("budgets.periodStart", "Period Start")}</Label>
                <Input
                  type="date"
                  value={form.periodStart}
                  onChange={(e) =>
                    setForm({ ...form, periodStart: e.target.value })
                  }
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t("budgets.periodEnd", "Period End")}</Label>
                <Input
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) =>
                    setForm({ ...form, periodEnd: e.target.value })
                  }
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t("budgets.periodType", "Period Type")}</Label>
                <Select
                  value={form.periodType}
                  onValueChange={(value) =>
                    setForm({ ...form, periodType: value as any })
                  }
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    <SelectItem value="monthly" className="dark:text-slate-200">
                      {t("budgets.periodTypes.monthly", "Monthly")}
                    </SelectItem>
                    <SelectItem value="quarterly" className="dark:text-slate-200">
                      {t("budgets.periodTypes.quarterly", "Quarterly")}
                    </SelectItem>
                    <SelectItem value="yearly" className="dark:text-slate-200">
                      {t("budgets.periodTypes.yearly", "Yearly")}
                    </SelectItem>
                    <SelectItem value="custom" className="dark:text-slate-200">
                      {t("budgets.periodTypes.custom", "Custom")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t("budgets.totalAmount", "Total Amount")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="dark:text-slate-200">{t("budgets.notes", "Notes")}</Label>
                <Textarea
                  placeholder={t(
                    "budgets.notesPlaceholder",
                    "Additional notes",
                  )}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="mb-6 dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="dark:text-white">
              {t("budgets.lineItems", "Budget Line Items")}
              {lines.length > 0 && (
                <Badge variant="outline" className="ml-2 dark:border-slate-600 dark:text-slate-200">
                  {lines.length}
                </Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addLine} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              <Plus className="mr-2 h-4 w-4" />
              {t("budgets.addLine", "Add Line")}
            </Button>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                <p>{t("budgets.noLines", "No line items yet")}</p>
                <p className="text-sm dark:text-slate-500">
                  {t(
                    "budgets.addLinesHint",
                    "Add line items to allocate budget to specific accounts",
                  )}
                </p>
                <Button variant="outline" className="mt-4 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700" onClick={addLine}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("budgets.addFirstLine", "Add First Line")}
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700/50">
                        <TableHead className="dark:text-slate-200">{t("budgets.account", "Account")}</TableHead>
                        <TableHead className="dark:text-slate-200">{t("budgets.month", "Month")}</TableHead>
                        <TableHead className="dark:text-slate-200">{t("budgets.year", "Year")}</TableHead>
                        <TableHead className="text-right dark:text-slate-200">
                          {t("budgets.budgetedAmount", "Budgeted Amount")}
                        </TableHead>
                        <TableHead className="dark:text-slate-200">
                          {t("budgets.category", "Category")}
                        </TableHead>
                        <TableHead className="dark:text-slate-200">{t("budgets.notes", "Notes")}</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="dark:bg-slate-800">
                      {lines.map((line, index) => (
                        <TableRow key={index} className="dark:hover:bg-slate-700/30">
                          <TableCell className="min-w-[200px]">
                            <Select
                              value={line.account_id}
                              onValueChange={(value) =>
                                updateLine(index, "account_id", value)
                              }
                            >
                              <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                <SelectValue
                                  placeholder={t(
                                    "budgets.selectAccount",
                                    "Select account",
                                  )}
                                />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-slate-800">
                                {filteredAccounts.map((acc) => (
                                  <SelectItem key={acc._id} value={acc._id} className="dark:text-slate-200">
                                    {acc.code} - {acc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={line.period_month.toString()}
                              onValueChange={(value) =>
                                updateLine(
                                  index,
                                  "period_month",
                                  parseInt(value),
                                )
                              }
                            >
                              <SelectTrigger className="w-[130px] dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-slate-800">
                                {MONTHS.map((m) => (
                                  <SelectItem
                                    key={m.value}
                                    value={m.value.toString()}
                                    className="dark:text-slate-200"
                                  >
                                    {m.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="w-[100px] dark:bg-slate-700 dark:text-white dark:border-slate-600"
                              value={line.period_year}
                              onChange={(e) =>
                                updateLine(
                                  index,
                                  "period_year",
                                  parseInt(e.target.value) || currentYear,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-[130px] text-right ml-auto dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                              placeholder="0.00"
                              value={line.budgeted_amount || ""}
                              onChange={(e) =>
                                updateLine(
                                  index,
                                  "budgeted_amount",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="w-[120px] dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                              placeholder={t(
                                "budgets.categoryPlaceholder",
                                "Category",
                              )}
                              value={line.category}
                              onChange={(e) =>
                                updateLine(index, "category", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="w-[140px] dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                              placeholder={t(
                                "budgets.notesPlaceholder",
                                "Notes",
                              )}
                              value={line.notes}
                              onChange={(e) =>
                                updateLine(index, "notes", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(index)}
                              className="dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Total */}
                <div className="flex justify-end mt-4 pt-4 border-t dark:border-slate-700">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground dark:text-slate-400">
                      {t("budgets.totalLineAmount", "Total Line Amount")}
                    </div>
                    <div className="text-xl font-bold dark:text-white">
                      {formatCurrency(totalLineAmount)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate("/budgets")} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEdit
              ? t("common.update", "Update Budget")
              : t("budgets.createBudget", "Create Budget")}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
