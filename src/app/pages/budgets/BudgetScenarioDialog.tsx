import { useState } from "react";
import { useTranslation } from "react-i18next";
import { budgetsApi } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { Slider } from "@/app/components/ui/slider";
import { toast } from "sonner";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Lightbulb,
  AlertCircle,
} from "lucide-react";

interface BudgetScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  budgetName: string;
  onSuccess?: () => void;
}

type ScenarioType = "optimistic" | "pessimistic" | "custom";

interface ScenarioPreset {
  type: ScenarioType;
  name: string;
  icon: React.ReactNode;
  description: string;
  defaultAdjustment: number;
  color: string;
  iconBg: string;
  selectedIconBg: string;
}

export function BudgetScenarioDialog({
  open,
  onOpenChange,
  budgetId,
  budgetName,
  onSuccess,
}: BudgetScenarioDialogProps) {
  const { t } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState<ScenarioType | null>(null);
  const [scenarioName, setScenarioName] = useState("");
  const [adjustmentPercent, setAdjustmentPercent] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const presets: ScenarioPreset[] = [
    {
      type: "optimistic",
      name: t("budgets.scenarios.optimistic", "Optimistic"),
      icon: <TrendingUp className="h-5 w-5" />,
      description: t("budgets.scenarios.optimisticDesc", "Higher revenue or lower costs than expected"),
      defaultAdjustment: 10,
      color: "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
      iconBg: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
      selectedIconBg: "bg-green-500 text-white",
    },
    {
      type: "pessimistic",
      name: t("budgets.scenarios.pessimistic", "Pessimistic"),
      icon: <TrendingDown className="h-5 w-5" />,
      description: t("budgets.scenarios.pessimisticDesc", "Lower revenue or higher costs than expected"),
      defaultAdjustment: -10,
      color: "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
      iconBg: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
      selectedIconBg: "bg-red-500 text-white",
    },
    {
      type: "custom",
      name: t("budgets.scenarios.custom", "Custom"),
      icon: <Lightbulb className="h-5 w-5" />,
      description: t("budgets.scenarios.customDesc", "Define your own scenario parameters"),
      defaultAdjustment: 0,
      color: "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20",
      iconBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
      selectedIconBg: "bg-blue-500 text-white",
    },
  ];

  const handlePresetSelect = (preset: ScenarioPreset) => {
    setSelectedPreset(preset.type);
    setAdjustmentPercent(preset.defaultAdjustment);
    if (!scenarioName || scenarioName === presets.find(p => p.type === selectedPreset)?.name) {
      setScenarioName(preset.name);
    }
  };

  const handleCreate = async () => {
    if (!selectedPreset) return;

    setLoading(true);
    try {
      const result = await budgetsApi.createScenario(budgetId, {
        scenario_type: selectedPreset,
        scenario_name: scenarioName,
        adjustments: {
          amount_adjustment_percent: adjustmentPercent,
          line_adjustment_percent: adjustmentPercent,
        },
        notes,
      });

      if (result.success) {
        toast.success(t("budgets.scenarios.created", "Scenario created successfully"));
        onSuccess?.();
        onOpenChange(false);
        resetForm();
      } else {
        toast.error(result.error || t("budgets.scenarios.createFailed", "Failed to create scenario"));
      }
    } catch (error: any) {
      toast.error(error.message || t("budgets.scenarios.createFailed", "Failed to create scenario"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPreset(null);
    setScenarioName("");
    setAdjustmentPercent(0);
    setNotes("");
  };

  const formatAdjustment = (value: number) => {
    if (value > 0) return `+${value}%`;
    if (value < 0) return `${value}%`;
    return "0%";
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) resetForm(); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{t("budgets.scenarios.createTitle", "Create Budget Scenario")}</DialogTitle>
          <DialogDescription>
            {t("budgets.scenarios.createDesc", "Create a what-if scenario based on")} <strong>{budgetName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 px-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Scenario Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t("budgets.scenarios.selectType", "Select Scenario Type")}</Label>
            <div className="grid grid-cols-1 gap-2">
              {presets.map((preset) => {
                const isSelected = selectedPreset === preset.type;
                return (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`group relative p-3 rounded-lg border-2 text-left transition-all duration-200 ease-in-out hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                      isSelected
                        ? `${preset.color} shadow-sm`
                        : "border-border bg-card hover:border-muted-foreground/30 hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
                        isSelected ? preset.selectedIconBg : preset.iconBg
                      }`}>
                        {preset.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm transition-colors ${
                            isSelected ? "text-foreground" : "text-foreground group-hover:text-foreground"
                          }`}>
                            {preset.name}
                          </span>
                          {isSelected && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium bg-primary/10 text-primary border-0">
                              {t("common.selected", "Selected")}
                            </Badge>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 leading-relaxed ${
                          isSelected ? "text-foreground/80" : "text-muted-foreground group-hover:text-foreground/70"
                        }`}>
                          {preset.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedPreset && (
            <>
              {/* Scenario Name */}
              <div className="space-y-1.5">
                <Label htmlFor="scenarioName" className="text-sm">{t("budgets.scenarios.name", "Scenario Name")}</Label>
                <Input
                  id="scenarioName"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder={t("budgets.scenarios.namePlaceholder", "e.g., Q1 Optimistic Scenario")}
                  className="h-9"
                />
              </div>

              {/* Adjustment Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">{t("budgets.scenarios.adjustment", "Budget Adjustment")}</Label>
                  <Badge variant={adjustmentPercent > 0 ? "default" : adjustmentPercent < 0 ? "destructive" : "secondary"} className="text-xs">
                    {formatAdjustment(adjustmentPercent)}
                  </Badge>
                </div>
                <Slider
                  value={[adjustmentPercent]}
                  onValueChange={(value) => setAdjustmentPercent(value[0])}
                  min={-50}
                  max={50}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-50%</span>
                  <span>0%</span>
                  <span>+50%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("budgets.scenarios.adjustmentDesc", "Adjust all budget amounts by this percentage")}
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm">{t("budgets.scenarios.notes", "Notes")}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("budgets.scenarios.notesPlaceholder", "Describe the assumptions for this scenario...")}
                  rows={2}
                  className="min-h-[60px] resize-none"
                />
              </div>

              {/* Preview */}
              <div className="bg-muted p-3 rounded-lg space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertCircle className="h-4 w-4" />
                  {t("budgets.scenarios.preview", "Preview")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("budgets.scenarios.previewText", "This will create a copy of")} <strong>{budgetName}</strong>{" "}
                  {t("budgets.scenarios.previewAdjustment", "with all amounts adjusted by")}{" "}
                  <strong>{formatAdjustment(adjustmentPercent)}</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedPreset || !scenarioName || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {t("budgets.scenarios.create", "Create Scenario")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
