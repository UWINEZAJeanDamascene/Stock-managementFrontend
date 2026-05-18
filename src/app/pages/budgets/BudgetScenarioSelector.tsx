import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { budgetsApi } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import {
  GitBranch,
  Plus,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  Layers,
} from "lucide-react";
import { BudgetScenarioDialog } from "./BudgetScenarioDialog";
import { BudgetScenarioComparison } from "./BudgetScenarioComparison";
import { useRef } from "react";

interface BudgetScenarioSelectorProps {
  budgetId: string;
  budgetName: string;
  currentScenario?: {
    scenario_type?: string;
    scenario_name?: string;
    is_primary_scenario?: boolean;
  };
  onScenarioChange?: (scenario: any) => void;
  onRefresh?: () => void;
}

export function BudgetScenarioSelector({
  budgetId,
  budgetName,
  currentScenario,
  onScenarioChange,
  onRefresh,
}: BudgetScenarioSelectorProps) {
  const { t } = useTranslation();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (budgetId) {
      fetchScenarios();
    }
  }, [budgetId]);

  // Debug dropdown state
  useEffect(() => {
  }, [dropdownOpen]);

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      console.log("Fetching scenarios for budget:", budgetId);
      const result = await budgetsApi.getScenarios(budgetId);
      console.log("Scenarios result:", result);
      if (result.success) {
        setScenarios(result.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch scenarios:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScenarioSwitch = (scenario: any) => {
    onScenarioChange?.(scenario);
  };

  const handleSetPrimary = async (scenarioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await budgetsApi.setPrimaryScenario(scenarioId);
      if (result.success) {
        toast.success(t("budgets.scenarios.setPrimarySuccess", "Scenario set as primary"));
        onRefresh?.();
        fetchScenarios();
      } else {
        toast.error(result.error || t("budgets.scenarios.setPrimaryFailed", "Failed to set as primary"));
      }
    } catch (error: any) {
      toast.error(error.message || t("budgets.scenarios.setPrimaryFailed", "Failed to set as primary"));
    }
  };

  const getScenarioIcon = (type: string) => {
    switch (type) {
      case "optimistic":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "pessimistic":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "base":
        return <Minus className="h-4 w-4 text-blue-500" />;
      default:
        return <GitBranch className="h-4 w-4 text-purple-500" />;
    }
  };

  const getScenarioBadgeColor = (type: string) => {
    switch (type) {
      case "base":
        return "bg-blue-100 text-blue-800";
      case "optimistic":
        return "bg-green-100 text-green-800";
      case "pessimistic":
        return "bg-red-100 text-red-800";
      default:
        return "bg-purple-100 text-purple-800";
    }
  };

  const hasMultipleScenarios = scenarios.length > 1;
  const primaryScenario = scenarios.find(s => s.is_primary_scenario) || scenarios[0];

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {t("budgets.scenarios.loading", "Loading...")}
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Scenario Selector Dropdown */}
        <DropdownMenu modal={false} onOpenChange={(open) => setDropdownOpen(open)}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="relative h-10 gap-2 rounded-lg border-white/15 bg-white/5 px-3 text-white hover:bg-white/15 hover:text-white"
              type="button"
              
            >
              <Layers className="h-4 w-4 text-indigo-200" />
              <span className="text-sm font-semibold">
                {t("budgets.scenarios.title", "Scenario")}:
              </span>
              <span className="max-w-[160px] truncate text-sm text-slate-100">
                {currentScenario?.scenario_name || primaryScenario?.scenario_name || t("budgets.scenarios.base", "Base Case")}
              </span>
              <ChevronDown className="ml-1 h-3.5 w-3.5 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-[9999] w-80 max-w-[90vw] border-slate-200 bg-popover shadow-xl dark:border-slate-800"
              sideOffset={8}
              avoidCollisions={true}
            >
            <DropdownMenuLabel>
              {t("budgets.scenarios.selectScenario", "Select Scenario")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {scenarios.map((scenario) => (
              <DropdownMenuItem
                key={scenario._id}
                className="flex cursor-pointer items-center justify-between gap-3 py-2.5"
                onClick={() => handleScenarioSwitch(scenario)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getScenarioIcon(scenario.scenario_type)}
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium truncate">{scenario.scenario_name || scenario.name}</span>
                    <div className="mt-1 flex items-center gap-1">
                      <Badge className={`text-xs ${getScenarioBadgeColor(scenario.scenario_type)}`}>
                        {scenario.scenario_type}
                      </Badge>
                      {scenario.is_primary_scenario && (
                        <Check className="h-3 w-3 text-primary" />
                      )}
                    </div>
                  </div>
                </div>
                {!scenario.is_primary_scenario && scenarios.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 rounded-md px-2 text-xs"
                    onClick={(e) => handleSetPrimary(scenario._id, e)}
                  >
                    {t("budgets.scenarios.setPrimaryShort", "Set Primary")}
                  </Button>
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4" />
              {t("budgets.scenarios.createNew", "Create New Scenario")}
            </DropdownMenuItem>

            {hasMultipleScenarios && (
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => setShowComparisonDialog(true)}
              >
                <BarChart3 className="h-4 w-4" />
                {t("budgets.scenarios.compare", "Compare Scenarios")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
          
        </DropdownMenu>

        {/* Comparison Button (visible when multiple scenarios exist) */}
        {hasMultipleScenarios && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 rounded-lg text-white hover:bg-white/10 hover:text-white"
            onClick={() => setShowComparisonDialog(true)}
          >
            <BarChart3 className="h-4 w-4" />
            {t("budgets.scenarios.compare", "Compare")}
          </Button>
        )}
      </div>

      {/* Create Scenario Dialog */}
      <BudgetScenarioDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        budgetId={budgetId}
        budgetName={budgetName}
        onSuccess={() => {
          fetchScenarios();
          onRefresh?.();
        }}
      />

      {/* Comparison Dialog */}
      <BudgetScenarioComparison
        open={showComparisonDialog}
        onOpenChange={setShowComparisonDialog}
        scenarios={scenarios}
        onRefresh={() => {
          fetchScenarios();
          onRefresh?.();
        }}
      />
    </>
  );
}
