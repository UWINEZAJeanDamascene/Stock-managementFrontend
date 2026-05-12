import { useState, useEffect } from "react";
import { budgetsApi } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { Loader2, Lock, Unlock, Clock, User, Settings, Shield, CalendarDays } from "lucide-react";

interface BudgetPeriodLockPanelProps {
  budgetId: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function BudgetPeriodLockPanel({ budgetId }: BudgetPeriodLockPanelProps) {
  const [lockData, setLockData] = useState<{
    settings: {
      auto_lock: {
        enabled: boolean;
        days_after_period_end: number;
      };
      fiscal_year_end: {
        month: number;
        day: number;
      };
      year_end_lock: {
        lock_previous_year: boolean;
        require_approval: boolean;
      };
    } | null;
    locked_periods: Array<{
      year: number;
      month: number;
      locked_at: string;
      locked_by?: { _id: string; name: string; email: string };
      reason: string;
      allow_transfers: boolean;
      allow_encumbrances: boolean;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month: number } | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [lockYear, setLockYear] = useState(new Date().getFullYear());
  const [lockMonth, setLockMonth] = useState(new Date().getMonth() + 1);
  const [allowTransfers, setAllowTransfers] = useState(true);

  useEffect(() => {
    fetchLocks();
  }, [budgetId]);

  const fetchLocks = async () => {
    try {
      const response = await budgetsApi.getPeriodLocks(budgetId);
      if (response.success) {
        setLockData(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch period locks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    setSaving(true);
    try {
      const response = await budgetsApi.lockPeriod(budgetId, {
        year: lockYear,
        month: lockMonth,
        reason: lockReason,
        allow_transfers: allowTransfers,
      });
      if (response.success) {
        toast.success(`Period ${lockYear}-${lockMonth} locked successfully`);
        setShowLockDialog(false);
        setLockReason("");
        fetchLocks();
      }
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("PERIOD_ALREADY_LOCKED")) {
        toast.error("Period is already locked");
      } else {
        toast.error(error?.message || "Failed to lock period");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUnlock = async () => {
    if (!selectedPeriod) return;
    setSaving(true);
    try {
      const response = await budgetsApi.unlockPeriod(budgetId, selectedPeriod.year, selectedPeriod.month);
      if (response.success) {
        toast.success(`Period ${selectedPeriod.year}-${selectedPeriod.month} unlocked successfully`);
        setShowUnlockDialog(false);
        setSelectedPeriod(null);
        fetchLocks();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to unlock period");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/50">
            <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Period Locking</h3>
        </div>
        <Button onClick={() => setShowLockDialog(true)} size="sm" className="shrink-0 gap-2">
          <Lock className="h-4 w-4" />
          Lock Period
        </Button>
      </div>

      {/* Auto-lock Settings */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-500" />
            Auto-Lock Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 dark:bg-amber-950/50">
                <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-900 dark:text-white">Enable Auto-Lock</Label>
                <p className="text-xs text-slate-500 dark:text-slate-400">Automatically lock periods after they end</p>
              </div>
            </div>
            <Switch
              checked={lockData?.settings?.auto_lock?.enabled || false}
              onCheckedChange={async (checked) => {
                try {
                  await budgetsApi.updateLockSettings(budgetId, {
                    auto_lock: { enabled: checked, days_after_period_end: lockData?.settings?.auto_lock?.days_after_period_end || 30 },
                  });
                  toast.success("Auto-lock settings updated");
                  fetchLocks();
                } catch (error) {
                  toast.error("Failed to update settings");
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Days After Period End</Label>
            <Input
              type="number"
              value={lockData?.settings?.auto_lock?.days_after_period_end || 30}
              onChange={async (e) => {
                const days = parseInt(e.target.value) || 30;
                try {
                  await budgetsApi.updateLockSettings(budgetId, {
                    auto_lock: { enabled: lockData?.settings?.auto_lock?.enabled || false, days_after_period_end: days },
                  });
                  fetchLocks();
                } catch (error) {
                  // Silent fail - will update on blur
                }
              }}
              min={1}
              max={365}
              className="dark:bg-slate-900 dark:border-slate-700"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automatically lock periods this many days after the period ends
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Locked Periods List */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            Locked Periods
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lockData?.locked_periods?.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900/50">
                <Unlock className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">No periods are currently locked</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lockData?.locked_periods?.map((period, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50/30 dark:bg-slate-900/30 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 dark:bg-amber-950/50">
                      <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {MONTHS[period.month - 1]} {period.year}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{period.reason || "No reason provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-end gap-1">
                        <User className="h-3 w-3" />
                        {typeof period.locked_by === "object" ? period.locked_by?.name : "System"}
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(period.locked_at)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPeriod({ year: period.year, month: period.month });
                        setShowUnlockDialog(true);
                      }}
                      className="h-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
                    >
                      <Unlock className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lock Dialog */}
      <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock Period</DialogTitle>
            <DialogDescription>
              Lock a specific period to prevent changes to budget actuals.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={lockYear}
                  onChange={(e) => setLockYear(parseInt(e.target.value) || new Date().getFullYear())}
                />
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={lockMonth.toString()} onValueChange={(v: string) => setLockMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                placeholder="Reason for locking..."
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Allow Budget Transfers</Label>
                <p className="text-xs text-muted-foreground">Allow transfers even when period is locked</p>
              </div>
              <Switch checked={allowTransfers} onCheckedChange={setAllowTransfers} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLockDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLock} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Lock className="mr-2 h-4 w-4" />
              Lock Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Period</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlock {selectedPeriod ? `${MONTHS[selectedPeriod.month - 1]} ${selectedPeriod.year}` : "this period"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlockDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnlock} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Unlock className="mr-2 h-4 w-4" />
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
