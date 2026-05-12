import { useState, useEffect } from "react";
import { budgetsApi, BudgetRevision } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { Loader2, History, RotateCcw, GitCompare, User, Calendar, ChevronDown, ChevronUp, FilePlus, Pencil, Trash2, Activity, ArrowLeftRight, SlidersHorizontal, GitCommit, TrendingUp, BarChart3 } from "lucide-react";

interface BudgetRevisionPanelProps {
  budgetId: string;
}

export function BudgetRevisionPanel({ budgetId }: BudgetRevisionPanelProps) {
  const [revisions, setRevisions] = useState<BudgetRevision[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<BudgetRevision | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareRev1, setCompareRev1] = useState<number | null>(null);
  const [compareRev2, setCompareRev2] = useState<number | null>(null);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [expandedRevisions, setExpandedRevisions] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchRevisions();
    fetchStats();
  }, [budgetId]);

  const fetchRevisions = async () => {
    try {
      const response = await budgetsApi.getRevisionHistory(budgetId, { limit: 50 });
      if (response.success) {
        setRevisions(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch revisions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await budgetsApi.getRevisionStats(budgetId);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch revision stats:", error);
    }
  };

  const handleRollback = async () => {
    if (!selectedRevision || !rollbackReason) return;
    setSubmitting(true);
    try {
      const response = await budgetsApi.rollbackToRevision(budgetId, selectedRevision.revision_number, rollbackReason);
      if (response.success) {
        toast.success(`Rolled back to revision ${selectedRevision.revision_number}`);
        setShowRollbackDialog(false);
        setRollbackReason("");
        fetchRevisions();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to rollback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompare = async () => {
    if (!compareRev1 || !compareRev2) return;
    setSubmitting(true);
    try {
      const response = await budgetsApi.compareRevisions(budgetId, compareRev1, compareRev2);
      if (response.success) {
        setComparisonResult(response.data);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to compare revisions");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = (revNumber: number) => {
    const newExpanded = new Set(expandedRevisions);
    if (newExpanded.has(revNumber)) {
      newExpanded.delete(revNumber);
    } else {
      newExpanded.add(revNumber);
    }
    setExpandedRevisions(newExpanded);
  };

  const getChangeTypeBadge = (type: string) => {
    const config: Record<string, { className: string; label: string; icon: any }> = {
      create: { className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/40", label: "Created", icon: FilePlus },
      update: { className: "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/40", label: "Updated", icon: Pencil },
      delete: { className: "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/40", label: "Deleted", icon: Trash2 },
      status_change: { className: "bg-purple-50 text-purple-700 ring-1 ring-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900/40", label: "Status", icon: Activity },
      line_added: { className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/40", label: "Line Added", icon: FilePlus },
      line_updated: { className: "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/40", label: "Line Updated", icon: Pencil },
      line_removed: { className: "bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/40", label: "Line Removed", icon: Trash2 },
      transfer: { className: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/40", label: "Transfer", icon: ArrowLeftRight },
      adjustment: { className: "bg-pink-50 text-pink-700 ring-1 ring-pink-100 dark:bg-pink-950/40 dark:text-pink-300 dark:ring-pink-900/40", label: "Adjustment", icon: SlidersHorizontal },
    };
    const configItem = config[type] || config.update;
    const Icon = configItem.icon;
    return (
      <Badge variant="outline" className={`border-0 gap-1 text-xs font-medium ${configItem.className}`}>
        <Icon className="h-3 w-3" />
        {configItem.label}
      </Badge>
    );
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900/50">
            <History className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Revision History</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCompareDialog(true)} className="gap-2">
            <GitCompare className="h-4 w-4" />
            Compare
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Revisions", value: stats.totalRevisions, icon: GitCommit, color: "slate" },
            { label: "Rolled Back", value: stats.rolledBackCount, icon: RotateCcw, color: "orange" },
            { label: "Change Types", value: Object.keys(stats.changeTypeBreakdown || {}).length, icon: BarChart3, color: "indigo" },
            { label: "Amount Impact", value: (stats.totalAmountImpact || 0).toLocaleString(), icon: TrendingUp, color: "emerald" },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            const colorMap: Record<string, string> = {
              slate: "bg-slate-50 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400",
              orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
              indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
              emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
            };
            return (
              <Card key={idx} className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{stat.label}</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{stat.value}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[stat.color]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Revision List */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900 dark:text-white flex items-center gap-2">
            <GitCommit className="h-4 w-4 text-slate-500" />
            Recent Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revisions.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900/50">
                <History className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">No revision history yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {revisions.map((revision) => (
                <div key={revision._id} className="border border-slate-200 rounded-lg overflow-hidden dark:border-slate-800">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                    onClick={() => toggleExpand(revision.revision_number)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                        #{revision.revision_number}
                      </span>
                      {getChangeTypeBadge(revision.change_type)}
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{revision.description}</span>
                      {revision.rolled_back && (
                        <Badge variant="outline" className="border-0 bg-red-50 text-red-700 ring-1 ring-red-100 text-xs font-medium dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/40">Rolled Back</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-end gap-1">
                          <User className="h-3 w-3" />
                          {typeof revision.changed_by === "object" ? revision.changed_by.name : "-"}
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(revision.changed_at)}
                        </div>
                      </div>
                      {expandedRevisions.has(revision.revision_number) ? (
                        <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                  </div>
                  {expandedRevisions.has(revision.revision_number) && (
                    <div className="border-t border-slate-200 px-4 py-3 bg-slate-50/30 dark:bg-slate-900/30 dark:border-slate-800">
                      <div className="space-y-3">
                        {revision.field_changes.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Field Changes</h4>
                            <div className="space-y-1.5">
                              {revision.field_changes.slice(0, 5).map((change, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-md border border-slate-100 bg-white dark:bg-slate-900 dark:border-slate-800">
                                  <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700">
                                    {change.change_type}
                                  </Badge>
                                  <span className="font-medium text-slate-900 dark:text-white">{change.field}:</span>
                                  <span className="text-slate-500 dark:text-slate-400 line-through">
                                    {JSON.stringify(change.old_value)?.substring(0, 30) || "null"}
                                  </span>
                                  <span className="text-slate-400 dark:text-slate-500">→</span>
                                  <span className="text-slate-900 dark:text-white">{JSON.stringify(change.new_value)?.substring(0, 30) || "null"}</span>
                                </div>
                              ))}
                              {revision.field_changes.length > 5 && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  +{revision.field_changes.length - 5} more changes
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRevision(revision);
                              setShowDetailDialog(true);
                            }}
                          >
                            View Details
                          </Button>
                          {!revision.rolled_back && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRevision(revision);
                                setShowRollbackDialog(true);
                              }}
                              className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/50"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Rollback
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revision #{selectedRevision?.revision_number} Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Change Type</Label>
                <div className="mt-1">{selectedRevision && getChangeTypeBadge(selectedRevision.change_type)}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Changed By</Label>
                <p className="mt-1">
                  {typeof selectedRevision?.changed_by === "object" ? selectedRevision.changed_by.name : "-"}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Changed At</Label>
                <p className="mt-1">{formatDate(selectedRevision?.changed_at || "")}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Amount Impact</Label>
                <p className="mt-1">{selectedRevision?.amount_impact?.toLocaleString() || 0}</p>
              </div>
            </div>
            {selectedRevision?.comments && (
              <div>
                <Label className="text-sm text-muted-foreground">Comments</Label>
                <p className="mt-1 text-sm">{selectedRevision.comments}</p>
              </div>
            )}
            {selectedRevision?.field_changes && selectedRevision.field_changes.length > 0 && (
              <div>
                <Label className="text-sm text-muted-foreground">All Field Changes</Label>
                <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                  {selectedRevision.field_changes.map((change, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm p-2 border rounded">
                      <Badge variant="outline" className="text-xs">{change.change_type}</Badge>
                      <span className="font-medium">{change.field}</span>
                      <span className="text-muted-foreground">{JSON.stringify(change.old_value) || "null"}</span>
                      <span>→</span>
                      <span>{JSON.stringify(change.new_value) || "null"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback to Revision #{selectedRevision?.revision_number}</DialogTitle>
            <DialogDescription>
              This will restore the budget to the state at this revision. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rollback..."
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRollbackDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRollback} disabled={submitting || !rollbackReason}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <RotateCcw className="mr-2 h-4 w-4" />
              Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compare Revisions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Revision</Label>
                <Select
                  value={compareRev1?.toString() || ""}
                  onValueChange={(v: string) => setCompareRev1(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select revision" />
                  </SelectTrigger>
                  <SelectContent>
                    {revisions.map((r) => (
                      <SelectItem key={r._id} value={r.revision_number.toString()}>
                        #{r.revision_number} - {r.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Second Revision</Label>
                <Select
                  value={compareRev2?.toString() || ""}
                  onValueChange={(v: string) => setCompareRev2(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select revision" />
                  </SelectTrigger>
                  <SelectContent>
                    {revisions.map((r) => (
                      <SelectItem key={r._id} value={r.revision_number.toString()}>
                        #{r.revision_number} - {r.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCompare} disabled={submitting || !compareRev1 || !compareRev2} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <GitCompare className="mr-2 h-4 w-4" />
              Compare
            </Button>
            {comparisonResult && (
              <div className="border rounded-lg p-4 mt-4">
                <h4 className="font-medium mb-2">Differences</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {comparisonResult.differences.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No differences found</p>
                  ) : (
                    comparisonResult.differences.map((diff: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm p-2 border rounded">
                        <span className="font-medium">{diff.field}:</span>
                        <span className="text-muted-foreground line-through">{JSON.stringify(diff.before)?.substring(0, 50)}</span>
                        <span>→</span>
                        <span>{JSON.stringify(diff.after)?.substring(0, 50)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
