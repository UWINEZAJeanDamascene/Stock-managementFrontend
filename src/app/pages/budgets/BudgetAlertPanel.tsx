import { useState, useEffect } from "react";
import { budgetsApi, BudgetAlert } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { Loader2, Bell, AlertTriangle, RefreshCw } from "lucide-react";

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
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Failed to load alert configuration</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Alert Configuration</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCheckVariance} disabled={checking}>
            {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <RefreshCw className="mr-2 h-4 w-4" />
            Check Now
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Enable/Disable */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Enable Alerts</h4>
              <p className="text-sm text-muted-foreground">Receive notifications when budget thresholds are reached</p>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, is_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert Thresholds (% of budget)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                Warning
              </Label>
              <Input
                type="number"
                value={config.thresholds.warning}
                onChange={(e) => updateThreshold("warning", parseInt(e.target.value) || 0)}
                min={0}
                max={100}
              />
              <p className="text-xs text-muted-foreground">Yellow alert at {config.thresholds.warning}%</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                Critical
              </Label>
              <Input
                type="number"
                value={config.thresholds.critical}
                onChange={(e) => updateThreshold("critical", parseInt(e.target.value) || 0)}
                min={0}
                max={100}
              />
              <p className="text-xs text-muted-foreground">Orange alert at {config.thresholds.critical}%</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                Exceeded
              </Label>
              <Input
                type="number"
                value={config.thresholds.exceeded}
                onChange={(e) => updateThreshold("exceeded", parseInt(e.target.value) || 0)}
                min={0}
                max={100}
              />
              <p className="text-xs text-muted-foreground">Red alert at {config.thresholds.exceeded}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={config.alert_frequency}
            onValueChange={(value: any) => setConfig({ ...config, alert_frequency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="once">Once (when threshold first reached)</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            How often to send repeated alerts for the same budget
          </p>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>In-App Notifications</Label>
              <p className="text-xs text-muted-foreground">Show alerts within the application</p>
            </div>
            <Switch
              checked={config.channels.in_app}
              onCheckedChange={(checked) =>
                setConfig({ ...config, channels: { ...config.channels, in_app: checked } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-xs text-muted-foreground">Send alert emails to configured recipients</p>
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
