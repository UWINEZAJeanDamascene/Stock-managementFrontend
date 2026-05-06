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
    scenario_type: string;
    scenario_name: string;
    is_primary_scenario: boolean;
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
              className="gap-2 h-9 px-3"
              type="button"
            >
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium hidden sm:inline">
                {t("budgets.scenarios.title", "Scenario")}:
              </span>
              <span className="text-sm font-medium sm:hidden">
                {t("budgets.scenarios.title", "Scenario")}
              </span>
              <span className="max-w-[80px] sm:max-w-[120px] truncate">
                {currentScenario?.scenario_name || primaryScenario?.scenario_name || t("budgets.scenarios.base", "Base Case")}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            className="w-80 bg-popover border shadow-lg rounded-lg p-1"
            sideOffset={6}
            alignOffset={0}
            avoidCollisions={true}
            collisionPadding={16}
          >
            <div className="px-3 py-2">
              <DropdownMenuLabel className="px-0 py-1 text-sm font-semibold text-foreground">
                {t("budgets.scenarios.selectScenario", "Select Scenario")}
              </DropdownMenuLabel>
              <p className="text-xs text-muted-foreground">
                {scenarios.length} {scenarios.length === 1 ? 'scenario' : 'scenarios'} available
              </p>
            </div>
            <DropdownMenuSeparator className="my-1" />

            <div className="max-h-[280px] overflow-y-auto">
              {scenarios.map((scenario) => (
                <DropdownMenuItem
                  key={scenario._id}
                  className="flex items-center justify-between py-2.5 px-3 cursor-pointer rounded-md mx-1 my-0.5 focus:bg-accent"
                  onClick={() => handleScenarioSwitch(scenario)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getScenarioIcon(scenario.scenario_type)}
                    </div>
                    <div className="flex flex-col min-w-0 gap-0.5">
                      <span className="font-medium text-sm truncate">{scenario.scenario_name || scenario.name}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${getScenarioBadgeColor(scenario.scenario_type)}`}>
                          {scenario.scenario_type}
                        </Badge>
                        {scenario.is_primary_scenario && (
                          <span className="flex items-center gap-0.5 text-xs text-primary">
                            <Check className="h-3 w-3" />
                            <span className="text-[10px]">Primary</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!scenario.is_primary_scenario && scenarios.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs ml-2 flex-shrink-0 hover:bg-muted"
                      onClick={(e) => handleSetPrimary(scenario._id, e)}
                    >
                      {t("budgets.scenarios.setPrimaryShort", "Set Primary")}
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
            </div>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              className="gap-2 cursor-pointer rounded-md mx-1 my-0.5 py-2 px-3 focus:bg-accent"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 text-primary" />
              <span className="text-sm">{t("budgets.scenarios.createNew", "Create New Scenario")}</span>
            </DropdownMenuItem>

            {hasMultipleScenarios && (
              <DropdownMenuItem
                className="gap-2 cursor-pointer rounded-md mx-1 my-0.5 py-2 px-3 focus:bg-accent"
                onClick={() => setShowComparisonDialog(true)}
              >
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t("budgets.scenarios.compare", "Compare Scenarios")}</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
          
        </DropdownMenu>

        {/* Comparison Button (visible when multiple scenarios exist) */}
        {hasMultipleScenarios && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
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
