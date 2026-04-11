import { useState, useEffect, useCallback } from "react";
import { chartOfAccountsApi, ChartOfAccountItem } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Plus,
  RefreshCw,
  Loader2,
  BookOpen,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  ArrowDownUp,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
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
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// Account type colors
const typeColors: Record<string, string> = {
  asset: "bg-blue-500",
  liability: "bg-orange-500",
  equity: "bg-purple-500",
  revenue: "bg-green-500",
  expense: "bg-red-500",
  cogs: "bg-pink-500",
};

// Account type labels
const typeLabels: Record<string, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
  cogs: "Cost of Goods Sold",
};

export default function ChartOfAccountsPage() {
  useTranslation();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ChartOfAccountItem[]>([]);
  const [grouped, setGrouped] = useState<Record<string, ChartOfAccountItem[]>>(
    {},
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] =
    useState<ChartOfAccountItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<any>(null);
  const [filterType, setFilterType] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Expanded sections in tree view
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    asset: true,
    liability: true,
    equity: true,
    revenue: true,
    expense: true,
    cogs: true,
  });

  // Form states
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    type: "expense",
    subtype: "",
    normal_balance: "debit",
    allow_direct_posting: true,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    subtype: "",
    normal_balance: "debit",
    allow_direct_posting: true,
    isActive: true,
  });

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType) params.type = filterType;
      if (showInactive) params.includeInactive = "true";

      const response = await chartOfAccountsApi.getAll(params);
      if (response.success) {
        setAccounts(response.data || []);
        setGrouped(response.grouped || {});
      }
    } catch (error) {
      console.error("[ChartOfAccountsPage] Failed to fetch accounts:", error);
      toast.error("Failed to load chart of accounts");
    } finally {
      setLoading(false);
    }
  }, [filterType, showInactive]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreate = async () => {
    if (!createForm.code || !createForm.name || !createForm.type) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const response = await chartOfAccountsApi.create({
        code: createForm.code,
        name: createForm.name,
        type: createForm.type,
        subtype: createForm.subtype || undefined,
        normal_balance: createForm.normal_balance,
        allow_direct_posting: createForm.allow_direct_posting,
      });

      if (response.success) {
        toast.success("Account created successfully");
        setShowCreateDialog(false);
        setCreateForm({
          code: "",
          name: "",
          type: "expense",
          subtype: "",
          normal_balance: "debit",
          allow_direct_posting: true,
        });
        fetchAccounts();
      } else {
        toast.error(response.message || "Failed to create account");
      }
    } catch (error: any) {
      console.error("[ChartOfAccountsPage] Create error:", error);
      toast.error(
        error.message ||
          error.response?.data?.message ||
          "Failed to create account",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      const response = await chartOfAccountsApi.update(selectedAccount._id, {
        name: editForm.name,
        subtype: editForm.subtype || undefined,
        normal_balance: editForm.normal_balance,
        allow_direct_posting: editForm.allow_direct_posting,
        isActive: editForm.isActive,
      });

      if (response.success) {
        toast.success("Account updated successfully");
        setShowEditDialog(false);
        setSelectedAccount(null);
        fetchAccounts();
      } else {
        toast.error("Failed to update account");
      }
    } catch (error: any) {
      console.error("[ChartOfAccountsPage] Update error:", error);
      toast.error(
        error.message ||
          error.response?.data?.message ||
          "Failed to update account",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      const response = await chartOfAccountsApi.delete(selectedAccount._id);

      if (response.success) {
        if (response.softDelete) {
          toast.warning(
            response.message || "Account deactivated (has journal entries)",
          );
        } else {
          toast.success("Account deleted successfully");
        }
        setShowDeleteDialog(false);
        setSelectedAccount(null);
        fetchAccounts();
      } else {
        toast.error("Failed to delete account");
      }
    } catch (error: any) {
      console.error("[ChartOfAccountsPage] Delete error:", error);
      toast.error(
        error.message ||
          error.response?.data?.message ||
          "Failed to delete account",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (account: ChartOfAccountItem) => {
    setSubmitting(true);
    try {
      const response = await chartOfAccountsApi.reactivate(account._id);
      if (response.success) {
        toast.success("Account reactivated successfully");
        fetchAccounts();
      } else {
        toast.error("Failed to reactivate account");
      }
    } catch (error: any) {
      console.error("[ChartOfAccountsPage] Reactivate error:", error);
      toast.error(error.message || "Failed to reactivate account");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (account: ChartOfAccountItem) => {
    setSelectedAccount(account);
    setEditForm({
      name: account.name,
      subtype: account.subtype || "",
      normal_balance: account.normal_balance,
      allow_direct_posting: account.allow_direct_posting,
      isActive: account.isActive,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (account: ChartOfAccountItem) => {
    setSelectedAccount(account);
    setShowDeleteDialog(true);
  };

  // ── Sync accounts ─────────────────────────────────────────────────
  const handleSyncPreview = async () => {
    setSyncing(true);
    setSyncPreview(null);
    try {
      const res = await chartOfAccountsApi.syncAccounts(true); // dry_run = true
      setSyncPreview(res.data);
      setShowSyncDialog(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to preview sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncApply = async () => {
    setSyncing(true);
    try {
      const res = await chartOfAccountsApi.syncAccounts(false); // apply
      const { inserted, updated, errors } = res.data;
      if (errors && errors.length > 0) {
        toast.warning(
          `Sync complete with ${errors.length} error(s). Inserted: ${inserted.length}, Updated: ${updated.length}`,
        );
      } else {
        toast.success(
          res.message ||
            `Sync complete. Inserted: ${inserted.length}, Updated: ${updated.length}`,
        );
      }
      setShowSyncDialog(false);
      setSyncPreview(null);
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply sync");
    } finally {
      setSyncing(false);
    }
  };

  const toggleSection = (type: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Filter accounts by search query
  const filterBySearch = (accountList: ChartOfAccountItem[]) => {
    if (!searchQuery) return accountList;
    const query = searchQuery.toLowerCase();
    return accountList.filter(
      (acc) =>
        acc.code.toLowerCase().includes(query) ||
        acc.name.toLowerCase().includes(query),
    );
  };

  const renderAccountRow = (account: ChartOfAccountItem) => (
    <TableRow
      key={account._id}
      className={!account.isActive ? "opacity-50 dark:opacity-60" : "dark:hover:bg-slate-700/30"}
    >
      <TableCell className="font-mono font-medium dark:text-slate-200">{account.code}</TableCell>
      <TableCell className="dark:text-slate-200">{account.name}</TableCell>
      <TableCell>
        <Badge
          className={`${typeColors[account.type] || "bg-gray-500"} text-white`}
        >
          {account.type}
        </Badge>
      </TableCell>
      <TableCell className="dark:text-slate-300">{account.subtype || "-"}</TableCell>
      <TableCell>
        <Badge
          variant={account.normal_balance === "debit" ? "default" : "secondary"}
          className="dark:bg-slate-600 dark:text-slate-200"
        >
          {account.normal_balance}
        </Badge>
      </TableCell>
      <TableCell>
        {account.allow_direct_posting ? (
          <ToggleRight className="h-5 w-5 text-green-500" />
        ) : (
          <ToggleLeft className="h-5 w-5 text-gray-400 dark:text-slate-500" />
        )}
      </TableCell>
      <TableCell>
        {account.isActive ? (
          <Badge className="bg-green-500 text-white">Active</Badge>
        ) : (
          <Badge variant="outline" className="dark:border-slate-500 dark:text-slate-400">
            Inactive
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditDialog(account)}
            title="Edit"
            className="dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Edit className="h-4 w-4" />
          </Button>
          {account.isActive ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openDeleteDialog(account)}
              title="Deactivate"
              className="dark:text-red-400 dark:hover:bg-slate-700"
            >
              <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleReactivate(account)}
              title="Reactivate"
              className="dark:text-green-400 dark:hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4 text-green-500 dark:text-green-400" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  const renderSection = (type: string) => {
    const sectionAccounts = filterBySearch(grouped[type] || []);
    if (sectionAccounts.length === 0) return null;

    const isExpanded = expandedSections[type];
    const totalBalance = sectionAccounts.length;

    return (
      <div key={type} className="mb-4">
        <div
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          onClick={() => toggleSection(type)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          )}
          <Badge className={`${typeColors[type] || "bg-gray-500"} text-white`}>
            {typeLabels[type] || type}
          </Badge>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {totalBalance} account{totalBalance !== 1 ? "s" : ""}
          </span>
        </div>

        {isExpanded && (
          <Table className="mt-2">
            <TableHeader>
              <TableRow className="dark:bg-slate-700/50">
                <TableHead className="w-24 dark:text-slate-200">Code</TableHead>
                <TableHead className="dark:text-slate-200">Name</TableHead>
                <TableHead className="dark:text-slate-200">Type</TableHead>
                <TableHead className="dark:text-slate-200">Subtype</TableHead>
                <TableHead className="dark:text-slate-200">Normal Bal.</TableHead>
                <TableHead className="dark:text-slate-200">Direct Post</TableHead>
                <TableHead className="dark:text-slate-200">Status</TableHead>
                <TableHead className="text-right dark:text-slate-200">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="dark:bg-slate-800">{sectionAccounts.map(renderAccountRow)}</TableBody>
          </Table>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
            <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h1 className="text-3xl font-bold dark:text-white">Chart of Accounts</h1>
              <p className="text-muted-foreground dark:text-slate-400">
                Manage your accounting structure
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSyncPreview}
              disabled={syncing}
              title="Sync missing/changed accounts from the system chart of accounts"
              className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownUp className="mr-2 h-4 w-4" />
              )}
              Sync Accounts
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-slate-400" />
                <Input
                  placeholder="Search by code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                />
              </div>
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-48 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="all" className="dark:text-slate-200">All Types</SelectItem>
                  <SelectItem value="asset" className="dark:text-slate-200">Assets</SelectItem>
                  <SelectItem value="liability" className="dark:text-slate-200">Liabilities</SelectItem>
                  <SelectItem value="equity" className="dark:text-slate-200">Equity</SelectItem>
                  <SelectItem value="revenue" className="dark:text-slate-200">Revenue</SelectItem>
                  <SelectItem value="expense" className="dark:text-slate-200">Expenses</SelectItem>
                  <SelectItem value="cogs" className="dark:text-slate-200">COGS</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-slate-500 dark:bg-slate-700"
                />
                <span className="text-sm dark:text-slate-300">Show Inactive</span>
              </label>
              <Button variant="outline" onClick={fetchAccounts} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tree View */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin dark:text-slate-400" />
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground dark:text-slate-400">
                No accounts found
              </div>
            ) : (
              <div>
                {[
                  "asset",
                  "liability",
                  "equity",
                  "revenue",
                  "expense",
                  "cogs",
                ].map(renderSection)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="mt-4 text-sm text-muted-foreground dark:text-slate-400">
          Total: {accounts.length} accounts | Active:{" "}
          {accounts.filter((a) => a.isActive).length} | Inactive:{" "}
          {accounts.filter((a) => !a.isActive).length}
        </div>

        {/* Create Account Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg dark:bg-slate-800 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Add New Account</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Create a new chart of account. Fields marked with * are
                required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Code *</Label>
                  <Input
                    placeholder="e.g., 6100"
                    value={createForm.code}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, code: e.target.value })
                    }
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Type *</Label>
                  <Select
                    value={createForm.type}
                    onValueChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        type: v,
                        normal_balance: ["asset", "expense", "cogs"].includes(v)
                          ? "debit"
                          : "credit",
                      })
                    }
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      <SelectItem value="asset" className="dark:text-slate-200">Asset</SelectItem>
                      <SelectItem value="liability" className="dark:text-slate-200">Liability</SelectItem>
                      <SelectItem value="equity" className="dark:text-slate-200">Equity</SelectItem>
                      <SelectItem value="revenue" className="dark:text-slate-200">Revenue</SelectItem>
                      <SelectItem value="expense" className="dark:text-slate-200">Expense</SelectItem>
                      <SelectItem value="cogs" className="dark:text-slate-200">COGS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Name *</Label>
                <Input
                  placeholder="Account name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Subtype</Label>
                  <Input
                    placeholder="e.g., current, operating"
                    value={createForm.subtype}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, subtype: e.target.value })
                    }
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Normal Balance</Label>
                  <Select
                    value={createForm.normal_balance}
                    onValueChange={(v) =>
                      setCreateForm({ ...createForm, normal_balance: v })
                    }
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      <SelectItem value="debit" className="dark:text-slate-200">Debit</SelectItem>
                      <SelectItem value="credit" className="dark:text-slate-200">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowDirectPosting"
                  checked={createForm.allow_direct_posting}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      allow_direct_posting: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300 dark:border-slate-500 dark:bg-slate-700"
                />
                <Label htmlFor="allowDirectPosting" className="cursor-pointer dark:text-slate-200">
                  Allow Direct Posting
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Account Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg dark:bg-slate-800 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Edit Account</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Update account details. Code cannot be changed.
              </DialogDescription>
            </DialogHeader>
            {selectedAccount && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Code</Label>
                    <Input
                      value={selectedAccount.code}
                      disabled
                      className="bg-slate-100 dark:bg-slate-700 dark:text-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Type</Label>
                    <Input
                      value={selectedAccount.type}
                      disabled
                      className="bg-slate-100 dark:bg-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Subtype</Label>
                    <Input
                      value={editForm.subtype}
                      onChange={(e) =>
                        setEditForm({ ...editForm, subtype: e.target.value })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">Normal Balance</Label>
                    <Select
                      value={editForm.normal_balance}
                      onValueChange={(v) =>
                        setEditForm({ ...editForm, normal_balance: v })
                      }
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="debit" className="dark:text-slate-200">Debit</SelectItem>
                        <SelectItem value="credit" className="dark:text-slate-200">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.allow_direct_posting}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          allow_direct_posting: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 dark:border-slate-500 dark:bg-slate-700"
                    />
                    <span className="dark:text-slate-200">Allow Direct Posting</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) =>
                        setEditForm({ ...editForm, isActive: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 dark:border-slate-500 dark:bg-slate-700"
                    />
                    <span className="dark:text-slate-200">Active</span>
                  </label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="dark:bg-slate-800 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Deactivate Account</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {selectedAccount && (
                  <>
                    Are you sure you want to deactivate account{" "}
                    <strong className="dark:text-slate-200">
                      {selectedAccount.code} - {selectedAccount.name}
                    </strong>
                    ?
                    <br />
                    <br />
                    If this account has journal entries, it will be deactivated
                    instead of deleted. You can reactivate it later.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sync Accounts Dialog */}
        <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto dark:bg-slate-800 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-white">
                <ArrowDownUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Sync Chart of Accounts
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Preview of changes that will be applied from the system chart of
                accounts definition. New accounts will be inserted and changed
                subtypes will be updated. No accounts will be deleted.
              </DialogDescription>
            </DialogHeader>

            {syncPreview && (
              <div className="space-y-4 py-2">
                {/* Summary badges */}
                <div className="flex gap-3 flex-wrap">
                  <Badge className="bg-green-500 text-white px-3 py-1">
                    {syncPreview.inserted?.length ?? 0} to insert
                  </Badge>
                  <Badge className="bg-amber-500 text-white px-3 py-1">
                    {syncPreview.updated?.length ?? 0} to update
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1 dark:bg-slate-600 dark:text-slate-200">
                    {syncPreview.skipped ?? 0} already current
                  </Badge>
                  {syncPreview.errors?.length > 0 && (
                    <Badge className="bg-red-500 text-white px-3 py-1">
                      {syncPreview.errors.length} errors
                    </Badge>
                  )}
                </div>

                {/* Accounts to insert */}
                {syncPreview.inserted?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                      <Plus className="h-4 w-4" /> New accounts to add
                    </h4>
                    <div className="rounded-md border divide-y text-sm dark:border-slate-600 dark:divide-slate-600">
                      {syncPreview.inserted.map((item: any) => (
                        <div
                          key={item.code}
                          className="flex items-center justify-between px-3 py-2 dark:bg-slate-700/30"
                        >
                          <span className="font-mono font-medium text-green-700 dark:text-green-400 w-16">
                            {item.code}
                          </span>
                          <span className="flex-1 text-slate-700 dark:text-slate-300">
                            {item.name}
                          </span>
                          {item.subtype && (
                            <Badge variant="outline" className="text-xs ml-2 dark:border-slate-500 dark:text-slate-300">
                              {item.subtype}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accounts to update */}
                {syncPreview.updated?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                      <Edit className="h-4 w-4" /> Accounts to update
                    </h4>
                    <div className="rounded-md border divide-y text-sm dark:border-slate-600 dark:divide-slate-600">
                      {syncPreview.updated.map((item: any) => (
                        <div key={item.code} className="px-3 py-2 dark:bg-slate-700/30">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-medium text-amber-700 dark:text-amber-400 w-16">
                              {item.code}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                          </div>
                          {item.changes &&
                            Object.entries(item.changes).map(
                              ([field, change]: [string, any]) => (
                                <div
                                  key={field}
                                  className="pl-18 text-xs text-slate-500 dark:text-slate-400 ml-16"
                                >
                                  <span className="font-medium">{field}:</span>{" "}
                                  <span className="line-through text-red-400">
                                    {String(change.from ?? "null")}
                                  </span>
                                  {" → "}
                                  <span className="text-green-600 dark:text-green-400">
                                    {String(change.to ?? "null")}
                                  </span>
                                </div>
                              ),
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nothing to do */}
                {syncPreview.inserted?.length === 0 &&
                  syncPreview.updated?.length === 0 && (
                    <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                      <RefreshCw className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="font-medium text-green-600 dark:text-green-400">
                        All accounts are already up-to-date!
                      </p>
                      <p className="text-sm mt-1">No changes needed.</p>
                    </div>
                  )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSyncDialog(false);
                  setSyncPreview(null);
                }}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              {syncPreview &&
                (syncPreview.inserted?.length > 0 ||
                  syncPreview.updated?.length > 0) && (
                  <Button
                    onClick={handleSyncApply}
                    disabled={syncing}
                    className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                  >
                    {syncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowDownUp className="mr-2 h-4 w-4" />
                    )}
                    Apply{" "}
                    {(syncPreview.inserted?.length ?? 0) +
                      (syncPreview.updated?.length ?? 0)}{" "}
                    changes
                  </Button>
                )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
