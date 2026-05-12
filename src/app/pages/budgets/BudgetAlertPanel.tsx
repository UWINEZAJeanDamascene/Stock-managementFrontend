import { useState, useEffect } from "react";
import { budgetsApi, BudgetAlert } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { Loader2, Bell, AlertTriangle, RefreshCw, BellRing, Mail, Monitor } from "lucide-react";

interface BudgetAlertPanelProps {
  budgetId: string;
}

export function BudgetAlertPanel({ budgetId }: BudgetAlertPanelProps) {
  const [config, setConfig] = useState<BudgetAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [budgetId]);

  const fetchConfig = async () => {
    try {
      const response = await budgetsApi.getAlertConfig(budgetId);
      if (response.success) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch alert config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const response = await budgetsApi.updateAlertConfig(budgetId, config);
      if (response.success) {
        toast.success("Alert configuration saved");
        setConfig(response.data);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckVariance = async () => {
    setChecking(true);
    try {
      const response = await budgetsApi.checkVariance(budgetId);
      if (response.success) {
        if (response.data.alerted) {
          toast.warning(`Budget ${response.data.level}: ${response.data.utilization?.toFixed(1)}% utilized`);
        } else {
          toast.success("Budget within limits");
        }
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to check variance");
    } finally {
      setChecking(false);
    }
  };

  const updateThreshold = (key: keyof BudgetAlert["thresholds"], value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      thresholds: { ...config.thresholds, [key]: value },
    });
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (!config) {
    return (
      <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/50">
            <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">Failed to load alert configuration</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/50">
            <BellRing className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Alert Configuration</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCheckVariance} disabled={checking} className="gap-2">
            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
            <RefreshCw className="h-4 w-4" />
            Check Now
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Enable/Disable */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/50">
                <Bell className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white">Enable Alerts</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Receive notifications when budget thresholds are reached</p>
              </div>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, is_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alert Thresholds (% of budget)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Warning
              </Label>
              <Input
                type="number"
                value={config.thresholds.warning}
                onChange={(e) => updateThreshold("warning", parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                className="dark:bg-slate-900 dark:border-slate-700"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Yellow alert at {config.thresholds.warning}%</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                Critical
              </Label>
              <Input
                type="number"
                value={config.thresholds.critical}
                onChange={(e) => updateThreshold("critical", parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                className="dark:bg-slate-900 dark:border-slate-700"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Orange alert at {config.thresholds.critical}%</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Exceeded
              </Label>
              <Input
                type="number"
                value={config.thresholds.exceeded}
                onChange={(e) => updateThreshold("exceeded", parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                className="dark:bg-slate-900 dark:border-slate-700"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Red alert at {config.thresholds.exceeded}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frequency */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            Alert Frequency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={config.alert_frequency}
            onValueChange={(value: any) => setConfig({ ...config, alert_frequency: value })}
          >
            <SelectTrigger className="dark:bg-slate-900 dark:border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="once">Once (when threshold first reached)</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            How often to send repeated alerts for the same budget
          </p>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Monitor className="h-4 w-4 text-slate-500" />
            Notification Channels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950/50">
                <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-900 dark:text-white">In-App Notifications</Label>
                <p className="text-xs text-slate-500 dark:text-slate-400">Show alerts within the application</p>
              </div>
            </div>
            <Switch
              checked={config.channels.in_app}
              onCheckedChange={(checked) =>
                setConfig({ ...config, channels: { ...config.channels, in_app: checked } })
              }
            />
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-950/50">
                <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-900 dark:text-white">Email Notifications</Label>
                <p className="text-xs text-slate-500 dark:text-slate-400">Send alert emails to configured recipients</p>
              </div>
            </div>
            <Switch
              checked={config.channels.email}
              onCheckedChange={(checked) =>
                setConfig({ ...config, channels: { ...config.channels, email: checked } })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
