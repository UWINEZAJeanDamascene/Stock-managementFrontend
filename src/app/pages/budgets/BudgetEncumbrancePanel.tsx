import { useState, useEffect } from "react";
import { budgetsApi, BudgetLine, Encumbrance } from "@/lib/api";
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
  Lock,
  Loader2,
  Droplets,
  Unlock,
  Wallet,
  AlertTriangle,
  FileText,
  Calendar,
} from "lucide-react";

interface BudgetEncumbrancePanelProps {
  budgetId: string;
  budgetLines: BudgetLine[];
  budgetStatus: string;
  canUpdate: boolean;
}

export function BudgetEncumbrancePanel({
  budgetId,
  budgetLines,
  budgetStatus,
  canUpdate,
}: BudgetEncumbrancePanelProps) {
  const [encumbrances, setEncumbrances] = useState<Encumbrance[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [selectedEncumbrance, setSelectedEncumbrance] = useState<Encumbrance | null>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [budgetLineId, setBudgetLineId] = useState("");
  const [sourceType, setSourceType] = useState<"purchase_order" | "goods_received_note" | "expense_request" | "manual">("purchase_order");
  const [sourceNumber, setSourceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchEncumbrances();
  }, [budgetId]);

  const fetchEncumbrances = async () => {
    try {
      const [encResponse, sumResponse] = await Promise.all([
        budgetsApi.getEncumbrances(budgetId),
        budgetsApi.getEncumbranceSummary(budgetId),
      ]);
      if (encResponse.success) {
        setEncumbrances(encResponse.data || []);
      }
      if (sumResponse.success) {
        setSummary(sumResponse.data);
      }
    } catch (error) {
      console.error("Failed to fetch encumbrances:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEncumbrance = async () => {
    if (!budgetLineId || !sourceNumber || !amount || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const selectedLine = budgetLines.find((line) => line._id === budgetLineId);
      const selectedAccountId = selectedLine
        ? typeof selectedLine.account_id === "object"
          ? selectedLine.account_id._id
          : selectedLine.account_id
        : "";

      if (!selectedLine || !selectedAccountId) {
        toast.error("Please select a valid budget line");
        setSubmitting(false);
        return;
      }

      const response = await budgetsApi.createEncumbrance(budgetId, {
        budget_line_id: budgetLineId,
        account_id: selectedAccountId,
        source_type: sourceType,
        source_id: `${sourceType}_${Date.now()}`,
        source_number: sourceNumber,
        description,
        amount: numAmount,
        expected_liquidation_date: expectedDate || undefined,
        notes: notes || undefined,
      });

      if (response.success) {
        toast.success("Encumbrance created successfully");
        setShowCreateDialog(false);
        resetForm();
        fetchEncumbrances();
      }
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("INSUFFICIENT_BUDGET")) {
        toast.error("Insufficient available budget for this encumbrance");
      } else if (msg.includes("ENCUMBRANCE_ALREADY_EXISTS")) {
        toast.error("An encumbrance already exists for this source document");
      } else {
        toast.error(error?.message || "Failed to create encumbrance");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async () => {
    if (!selectedEncumbrance) return;

    setSubmitting(true);
    try {
      const response = await budgetsApi.releaseEncumbrance(
        selectedEncumbrance.source_type,
        selectedEncumbrance.source_id,
        releaseReason
      );
      if (response.success) {
        toast.success("Encumbrance released successfully");
        setShowReleaseDialog(false);
        setSelectedEncumbrance(null);
        setReleaseReason("");
        fetchEncumbrances();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to release encumbrance");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setBudgetLineId("");
    setSourceType("purchase_order");
    setSourceNumber("");
    setAmount("");
    setDescription("");
    setExpectedDate("");
    setNotes("");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string; icon: any }> = {
      active: { className: "bg-amber-100 text-amber-700", label: "Active", icon: Lock },
      partially_liquidated: { className: "bg-blue-100 text-blue-700", label: "Partially Liquidated", icon: Droplets },
      fully_liquidated: { className: "bg-green-100 text-green-700", label: "Fully Liquidated", icon: Wallet },
      released: { className: "bg-gray-100 text-gray-700", label: "Released", icon: Unlock },
      cancelled: { className: "bg-red-100 text-red-700", label: "Cancelled", icon: AlertTriangle },
    };
    const configItem = config[status] || config.active;
    const Icon = configItem.icon;
    return (
      <Badge className={`${configItem.className} gap-1`}>
        <Icon className="h-3 w-3" />
        {configItem.label}
      </Badge>
    );
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

  const toAmount = (value: unknown) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
  };

  const originalEncumbered = encumbrances.reduce(
    (sum, enc) => sum + toAmount(enc.encumbered_amount),
    0,
  );
  const openCommitted = encumbrances.reduce(
    (sum, enc) => sum + toAmount(enc.remaining_amount),
    0,
  );
  const liquidatedAmount = encumbrances.reduce(
    (sum, enc) => sum + toAmount(enc.liquidated_amount),
    0,
  );
  const activeEncumbranceCount = encumbrances.filter((enc) =>
    ["active", "partially_liquidated"].includes(enc.status),
  ).length;
  const summaryOriginalEncumbered = encumbrances.length
    ? originalEncumbered
    : toAmount(summary?.totalEncumbered ?? summary?.total_encumbered);
  const summaryOpenCommitted = encumbrances.length
    ? openCommitted
    : toAmount(summary?.totalRemaining ?? summary?.total_remaining);
  const summaryActiveCount = encumbrances.length
    ? activeEncumbranceCount
    : Number(summary?.byStatus?.active?.count || summary?.by_status?.active || 0);

  const getLineLabel = (lineId: string) => {
    const line = budgetLines.find((l) => l._id === lineId);
    if (!line) return "Unknown";
    const account = typeof line.account_id === "object" ? line.account_id : null;
    const project =
      line.project_id && typeof line.project_id === "object"
        ? ` - ${line.project_id.wbs_code || line.wbs_code || line.project_id.project_code}`
        : line.wbs_code
          ? ` - ${line.wbs_code}`
          : "";
    return `${account?.code || ""} - ${account?.name || "Unknown"}${project}`;
  };

  const canCreateEncumbrance =
    canUpdate && ["approved", "active", "locked"].includes(budgetStatus);

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
      {/* Summary Cards */}
      {(summary || encumbrances.length > 0) && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Original Encumbrances</div>
              <div className="text-xl font-semibold text-amber-600">
                {formatCurrency(summaryOriginalEncumbered)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Open Commitments</div>
              <div className="text-xl font-semibold text-blue-600">
                {formatCurrency(summaryOpenCommitted)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Liquidated to Actual</div>
              <div className="text-xl font-semibold text-red-500">
                {formatCurrency(liquidatedAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Active Encumbrances</div>
              <div className="text-xl font-semibold">
                {summaryActiveCount}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">Budget Encumbrances</h3>
          {encumbrances.length > 0 && (
            <Badge variant="secondary">{encumbrances.length}</Badge>
          )}
        </div>
        {canCreateEncumbrance && (
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Lock className="mr-2 h-4 w-4" />
            Reserve Budget
          </Button>
        )}
      </div>

      {/* Encumbrances List */}
      {encumbrances.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No budget encumbrances yet</p>
            {canCreateEncumbrance && (
              <p className="text-sm mt-1">
                Click "Reserve Budget" to commit budget for upcoming expenses
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
                  <TableHead>Source</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Liquidated</TableHead>
                  <TableHead>Open</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encumbrances.map((enc) => (
                  <TableRow key={enc._id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {enc.source_number}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {enc.source_type.replace("_", " ")}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {enc.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {typeof enc.account_id === "object"
                        ? `${enc.account_id.code} - ${enc.account_id.name}`
                        : enc.account_id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(enc.encumbered_amount)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCurrency(enc.liquidated_amount)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCurrency(enc.remaining_amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(enc.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(enc.encumbrance_date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Release button for active/partial encumbrances */}
                        {["active", "partially_liquidated"].includes(enc.status) && canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedEncumbrance(enc);
                              setShowReleaseDialog(true);
                            }}
                            disabled={submitting}
                            title="Release Encumbrance"
                          >
                            <Unlock className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        {!["active", "partially_liquidated"].includes(enc.status) && (
                          <span className="text-xs text-muted-foreground">
                            No open commitment
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

      {/* Create Encumbrance Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reserve Budget (Create Encumbrance)</DialogTitle>
            <DialogDescription>
              Commit budget for upcoming expenses. This reserves the amount so it cannot be spent elsewhere.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Source Type */}
            <div className="space-y-2">
              <Label>Source Type *</Label>
              <Select
                value={sourceType}
                onValueChange={(v) => setSourceType(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase_order">Purchase Order</SelectItem>
                  <SelectItem value="goods_received_note">Goods Received Note</SelectItem>
                  <SelectItem value="expense_request">Expense Request</SelectItem>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source Number */}
            <div className="space-y-2">
              <Label>Source Number *</Label>
              <Input
                value={sourceNumber}
                onChange={(e) => setSourceNumber(e.target.value)}
                placeholder="e.g., PO-2024-001"
              />
            </div>

            {/* Budget Line */}
            <div className="space-y-2">
              <Label>Budget Line *</Label>
              <Select value={budgetLineId} onValueChange={setBudgetLineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select budget line" />
                </SelectTrigger>
                <SelectContent>
                  {budgetLines.map((line) => {
                    const account =
                      typeof line.account_id === "object"
                        ? line.account_id
                        : null;
                    const project =
                      line.project_id && typeof line.project_id === "object"
                        ? line.project_id.wbs_code || line.wbs_code || line.project_id.project_code
                        : line.wbs_code;
                    const available =
                      Number(line.budgeted_amount || 0) -
                      Number(line.encumbered_amount || 0) -
                      Number(line.actual_amount || 0);
                    return (
                      <SelectItem key={line._id} value={line._id}>
                        {account?.code || ""} - {account?.name || "Unknown"}
                        {project ? ` - ${project}` : ""} ({formatCurrency(available)} available)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {budgetLineId && (
                <p className="text-xs text-muted-foreground">
                  Selected: {getLineLabel(budgetLineId)}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount to Reserve *</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min={0}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Office supplies for Q1"
              />
            </div>

            {/* Expected Liquidation Date */}
            <div className="space-y-2">
              <Label>Expected Payment Date</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateEncumbrance}
              disabled={submitting || !budgetLineId || !sourceNumber || !amount || !description}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reserve Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Dialog */}
      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Release Encumbrance</DialogTitle>
            <DialogDescription>
              Release the remaining committed budget. This will free up the reserved amount.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              placeholder="Enter reason for release (e.g., PO cancelled, order changed)..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRelease}
              disabled={submitting || !releaseReason}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
