import { useState, useEffect } from "react";
import { budgetsApi, BudgetApproval } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Clock, User } from "lucide-react";

interface BudgetApprovalPanelProps {
  budgetId: string;
  budgetStatus: string;
  onApprovalChange: () => void;
}

export function BudgetApprovalPanel({ budgetId, budgetStatus, onApprovalChange }: BudgetApprovalPanelProps) {
  const [approvals, setApprovals] = useState<BudgetApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<BudgetApproval | null>(null);
  const [comments, setComments] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchApprovals();
  }, [budgetId]);

  const fetchApprovals = async () => {
    try {
      const response = await budgetsApi.getApprovalHistory(budgetId);
      if (response.success) {
        setApprovals(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setSubmitting(true);
    try {
      const response = await budgetsApi.submitForApproval(budgetId, {
        workflow_type: "budget_creation",
        priority: "normal",
      });
      if (response.success) {
        toast.success("Budget submitted for approval");
        setShowSubmitDialog(false);
        fetchApprovals();
        onApprovalChange();
      }
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("APPROVAL_ALREADY_PENDING")) {
        toast.error("An approval is already pending for this budget");
      } else {
        toast.error(error?.message || "Failed to submit for approval");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;
    setSubmitting(true);
    try {
      const response = await budgetsApi.approveStep(budgetId, selectedApproval._id, comments);
      if (response.success) {
        toast.success("Step approved successfully");
        setShowApproveDialog(false);
        setSelectedApproval(null);
        setComments("");
        fetchApprovals();
        onApprovalChange();
      }
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("ALREADY_APPROVED")) {
        toast.error("You have already approved this step");
      } else {
        toast.error(error?.message || "Failed to approve");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    setSubmitting(true);
    try {
      const response = await budgetsApi.rejectApproval(budgetId, selectedApproval._id, rejectReason);
      if (response.success) {
        toast.success("Approval rejected");
        setShowRejectDialog(false);
        setSelectedApproval(null);
        setRejectReason("");
        fetchApprovals();
        onApprovalChange();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to reject");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-yellow-100 text-yellow-700", label: "Pending" },
      in_progress: { className: "bg-blue-100 text-blue-700", label: "In Progress" },
      approved: { className: "bg-green-100 text-green-700", label: "Approved" },
      rejected: { className: "bg-red-100 text-red-700", label: "Rejected" },
      changes_requested: { className: "bg-orange-100 text-orange-700", label: "Changes Requested" },
      cancelled: { className: "bg-gray-100 text-gray-700", label: "Cancelled" },
    };
    const configItem = config[status] || config.pending;
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

  const pendingApproval = approvals.find((a) => ["pending", "in_progress", "changes_requested"].includes(a.status));
  const canSubmit = budgetStatus === "draft" && !pendingApproval;

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
        <h3 className="text-lg font-semibold">Approval Workflow</h3>
        {canSubmit && (
          <Button onClick={() => setShowSubmitDialog(true)} size="sm">
            <Clock className="mr-2 h-4 w-4" />
            Submit for Approval
          </Button>
        )}
      </div>

      {/* Current Approval Status */}
      {pendingApproval ? (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Current Approval Status
              {getStatusBadge(pendingApproval.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Step</span>
                <span className="font-medium">
                  {pendingApproval.current_step} of {pendingApproval.total_steps}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Step</span>
                <span className="font-medium">
                  {pendingApproval.steps[pendingApproval.current_step - 1]?.step_name || "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Requested By</span>
                <span>{typeof pendingApproval.requested_by === "object" ? pendingApproval.requested_by.name : "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Requested At</span>
                <span>{formatDate(pendingApproval.requested_at)}</span>
              </div>
              {pendingApproval.request_comments && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Comments</span>
                  <p className="text-sm mt-1">{pendingApproval.request_comments}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedApproval(pendingApproval);
                    setShowApproveDialog(true);
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setSelectedApproval(pendingApproval);
                    setShowRejectDialog(true);
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-muted-foreground">No pending approvals</p>
            {budgetStatus === "approved" && (
              <p className="text-sm text-green-600 mt-1">This budget has been approved</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approval History */}
      {approvals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div key={approval._id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(approval.status)}
                      <span className="text-sm text-muted-foreground">
                        {approval.workflow_name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(approval.requested_at)}
                    </span>
                  </div>
                  {approval.actions.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {approval.actions.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="font-medium">
                              {typeof action.action_by === "object" ? action.action_by.name : "-"}
                            </span>
                            <span className="text-muted-foreground"> {action.action} </span>
                            <span className="text-muted-foreground">
                              step {action.step_number}
                            </span>
                            {action.comments && (
                              <p className="text-xs text-muted-foreground mt-1">
                                &quot;{action.comments}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for Approval</DialogTitle>
            <DialogDescription>
              Submit this budget for multi-level approval workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Optional comments for approvers..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitForApproval} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Step</DialogTitle>
            <DialogDescription>
              Approve the current step in the approval workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Optional comments..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Approval</DialogTitle>
            <DialogDescription>
              Reject this approval and provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={submitting || !rejectReason}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
