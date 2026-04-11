import { useState, useEffect } from "react";
import { budgetsApi, BudgetRevision } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { Loader2, History, RotateCcw, GitCompare, User, Calendar, ChevronDown, ChevronUp } from "lucide-react";

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
    const config: Record<string, { className: string; label: string }> = {
      create: { className: "bg-green-100 text-green-700", label: "Created" },
      update: { className: "bg-blue-100 text-blue-700", label: "Updated" },
      delete: { className: "bg-red-100 text-red-700", label: "Deleted" },
      status_change: { className: "bg-purple-100 text-purple-700", label: "Status" },
      line_added: { className: "bg-emerald-100 text-emerald-700", label: "Line Added" },
      line_updated: { className: "bg-yellow-100 text-yellow-700", label: "Line Updated" },
      line_removed: { className: "bg-orange-100 text-orange-700", label: "Line Removed" },
      transfer: { className: "bg-cyan-100 text-cyan-700", label: "Transfer" },
      adjustment: { className: "bg-pink-100 text-pink-700", label: "Adjustment" },
    };
    const configItem = config[type] || config.update;
    return <Badge className={configItem.className}>{configItem.label}</Badge>;
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
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Revision History</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCompareDialog(true)}>
            <GitCompare className="mr-2 h-4 w-4" />
            Compare
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.totalRevisions}</div>
              <div className="text-sm text-muted-foreground">Total Revisions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.rolledBackCount}</div>
              <div className="text-sm text-muted-foreground">Rolled Back</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{Object.keys(stats.changeTypeBreakdown || {}).length}</div>
              <div className="text-sm text-muted-foreground">Change Types</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{(stats.totalAmountImpact || 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Amount Impact</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revision List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Changes</CardTitle>
        </CardHeader>
        <CardContent>
          {revisions.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No revision history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {revisions.map((revision) => (
                <div key={revision._id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(revision.revision_number)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground">
                        #{revision.revision_number}
                      </span>
                      {getChangeTypeBadge(revision.change_type)}
                      <span className="font-medium">{revision.description}</span>
                      {revision.rolled_back && (
                        <Badge variant="destructive">Rolled Back</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {typeof revision.changed_by === "object" ? revision.changed_by.name : "-"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(revision.changed_at)}
                        </div>
                      </div>
                      {expandedRevisions.has(revision.revision_number) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  {expandedRevisions.has(revision.revision_number) && (
                    <div className="border-t px-4 py-3 bg-muted/30">
                      <div className="space-y-3">
                        {revision.field_changes.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Field Changes</h4>
                            <div className="space-y-1">
                              {revision.field_changes.slice(0, 5).map((change, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <Badge variant="outline" className="text-xs">
                                    {change.change_type}
                                  </Badge>
                                  <span className="font-medium">{change.field}:</span>
                                  <span className="text-muted-foreground line-through">
                                    {JSON.stringify(change.old_value)?.substring(0, 30) || "null"}
                                  </span>
                                  <span>→</span>
                                  <span>{JSON.stringify(change.new_value)?.substring(0, 30) || "null"}</span>
                                </div>
                              ))}
                              {revision.field_changes.length > 5 && (
                                <p className="text-xs text-muted-foreground">
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
                            >
                              <RotateCcw className="mr-2 h-3 w-3" />
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
