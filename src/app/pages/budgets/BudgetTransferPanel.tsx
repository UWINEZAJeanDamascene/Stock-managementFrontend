import { useState, useEffect } from "react";
import { budgetsApi, BudgetLine, BudgetTransfer } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
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
import {
  ArrowRightLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Play,
  Ban,
  User,
  Calendar,
} from "lucide-react";

interface BudgetTransferPanelProps {
  budgetId: string;
  budgetLines: BudgetLine[];
  budgetStatus: string;
  canApprove: boolean;
  canUpdate: boolean;
}

export function BudgetTransferPanel({
  budgetId,
  budgetLines,
  budgetStatus,
  canApprove,
  canUpdate,
}: BudgetTransferPanelProps) {
  const [transfers, setTransfers] = useState<BudgetTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<BudgetTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fromLineId, setFromLineId] = useState("");
  const [toLineId, setToLineId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchTransfers();
  }, [budgetId]);

  const fetchTransfers = async () => {
    try {
      const response = await budgetsApi.getTransfers(budgetId);
      if (response.success) {
        setTransfers(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch transfers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async () => {
    if (!fromLineId || !toLineId || !amount || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (fromLineId === toLineId) {
      toast.error("Cannot transfer to the same budget line");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const response = await budgetsApi.createTransfer(budgetId, {
        from_line_id: fromLineId,
        to_line_id: toLineId,
        amount: numAmount,
        transfer_date: transferDate,
        reason,
      });

      if (response.success) {
        toast.success("Transfer request created successfully");
        setShowCreateDialog(false);
        resetForm();
        fetchTransfers();
      }
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("TRANSFER_ALREADY_PENDING")) {
        toast.error("A transfer between these lines is already pending");
      } else if (msg.includes("TRANSFER_INSUFFICIENT_BUDGET")) {
        toast.error("Insufficient budget in source line");
      } else {
        toast.error(error?.message || "Failed to create transfer");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (transfer: BudgetTransfer) => {
    setSubmitting(true);
    try {
      const response = await budgetsApi.approveTransfer(budgetId, transfer._id);
      if (response.success) {
        toast.success("Transfer approved successfully");
        fetchTransfers();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to approve transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecute = async (transfer: BudgetTransfer) => {
    setSubmitting(true);
    try {
      const response = await budgetsApi.executeTransfer(budgetId, transfer._id);
      if (response.success) {
        toast.success("Transfer executed successfully");
        fetchTransfers();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to execute transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTransfer) return;

    setSubmitting(true);
    try {
      const response = await budgetsApi.rejectTransfer(
        budgetId,
        selectedTransfer._id,
        rejectReason
      );
      if (response.success) {
        toast.success("Transfer rejected");
        setShowRejectDialog(false);
        setSelectedTransfer(null);
        setRejectReason("");
        fetchTransfers();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to reject transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (transfer: BudgetTransfer) => {
    setSubmitting(true);
    try {
      const response = await budgetsApi.cancelTransfer(budgetId, transfer._id);
      if (response.success) {
        toast.success("Transfer cancelled");
        fetchTransfers();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to cancel transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFromLineId("");
    setToLineId("");
    setAmount("");
    setReason("");
    setTransferDate(new Date().toISOString().split("T")[0]);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-yellow-100 text-yellow-700", label: "Pending" },
      approved: { className: "bg-blue-100 text-blue-700", label: "Approved" },
      rejected: { className: "bg-red-100 text-red-700", label: "Rejected" },
      executed: { className: "bg-green-100 text-green-700", label: "Executed" },
      cancelled: { className: "bg-gray-100 text-gray-700", label: "Cancelled" },
    };
    const { className, label } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
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

  const getLineLabel = (lineId: string) => {
    const line = budgetLines.find((l) => l._id === lineId);
    if (!line) return "Unknown";
    const account = typeof line.account_id === "object" ? line.account_id : null;
    return `${account?.code || ""} - ${account?.name || "Unknown"} (${formatCurrency(
      line.budgeted_amount
    )})`;
  };

  const canCreateTransfer =
    canUpdate && ["draft", "approved", "locked"].includes(budgetStatus);

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
          <ArrowRightLeft className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-semibold">Budget Transfers</h3>
          {transfers.length > 0 && (
            <Badge variant="secondary">{transfers.length}</Badge>
          )}
        </div>
        {canCreateTransfer && (
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Request Transfer
          </Button>
        )}
      </div>

      {/* Transfers List */}
      {transfers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No budget transfers yet</p>
            {canCreateTransfer && (
              <p className="text-sm mt-1">
                Click "Request Transfer" to move budget between accounts
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From → To</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer._id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {transfer.from_account_code}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          → {transfer.to_account_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(transfer.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3" />
                        {typeof transfer.requested_by === "object"
                          ? transfer.requested_by.name
                          : "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(transfer.transfer_date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Approve button for pending transfers */}
                        {transfer.status === "pending" && canApprove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(transfer)}
                            disabled={submitting}
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}

                        {/* Execute button for approved transfers */}
                        {transfer.status === "approved" && canApprove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExecute(transfer)}
                            disabled={submitting}
                            title="Execute Transfer"
                          >
                            <Play className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}

                        {/* Reject button for pending/approved transfers */}
                        {["pending", "approved"].includes(transfer.status) &&
                          canApprove && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTransfer(transfer);
                                setShowRejectDialog(true);
                              }}
                              disabled={submitting}
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          )}

                        {/* Cancel button for pending transfers (requester only) */}
                        {transfer.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancel(transfer)}
                            disabled={submitting}
                            title="Cancel"
                          >
                            <Ban className="h-4 w-4 text-gray-600" />
                          </Button>
                        )}

                        {/* Show reason for rejected transfers */}
                        {transfer.status === "rejected" &&
                          transfer.rejection_reason && (
                            <span
                              className="text-xs text-red-600 max-w-[150px] truncate"
                              title={transfer.rejection_reason}
                            >
                              {transfer.rejection_reason}
                            </span>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Transfer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Budget Transfer</DialogTitle>
            <DialogDescription>
              Move budgeted amount from one account to another within this budget.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* From Line */}
            <div className="space-y-2">
              <Label>From Account (Source) *</Label>
              <Select value={fromLineId} onValueChange={setFromLineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {budgetLines.map((line) => {
                    const account =
                      typeof line.account_id === "object"
                        ? line.account_id
                        : null;
                    return (
                      <SelectItem key={line._id} value={line._id}>
                        {account?.code || ""} - {account?.name || "Unknown"}{" "}
                        ({formatCurrency(line.budgeted_amount)})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* To Line */}
            <div className="space-y-2">
              <Label>To Account (Destination) *</Label>
              <Select value={toLineId} onValueChange={setToLineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {budgetLines.map((line) => {
                    const account =
                      typeof line.account_id === "object"
                        ? line.account_id
                        : null;
                    return (
                      <SelectItem key={line._id} value={line._id}>
                        {account?.code || ""} - {account?.name || "Unknown"}{" "}
                        ({formatCurrency(line.budgeted_amount)})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount to Transfer *</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min={0}
              />
              {fromLineId && (
                <p className="text-xs text-muted-foreground">
                  Available: {getLineLabel(fromLineId)}
                </p>
              )}
            </div>

            {/* Transfer Date */}
            <div className="space-y-2">
              <Label>Transfer Date *</Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Reason for Transfer *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Reallocating unused marketing budget to operations"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTransfer}
              disabled={
                submitting ||
                !fromLineId ||
                !toLineId ||
                !amount ||
                !reason ||
                fromLineId === toLineId
              }
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Request Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Transfer</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this transfer request.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting || !rejectReason}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
