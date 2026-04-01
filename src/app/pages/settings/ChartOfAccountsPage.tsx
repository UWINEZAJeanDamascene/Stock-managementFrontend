import { useState, useEffect, useCallback } from 'react';
import { chartOfAccountsApi, ChartOfAccountItem } from '@/lib/api';
import { Layout } from '../../layout/Layout';
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
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// Account type colors
const typeColors: Record<string, string> = {
  asset: 'bg-blue-500',
  liability: 'bg-orange-500',
  equity: 'bg-purple-500',
  revenue: 'bg-green-500',
  expense: 'bg-red-500',
  cogs: 'bg-pink-500',
};

// Account type labels
const typeLabels: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
  cogs: 'Cost of Goods Sold',
};

export default function ChartOfAccountsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ChartOfAccountItem[]>([]);
  const [grouped, setGrouped] = useState<Record<string, ChartOfAccountItem[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccountItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  
  // Expanded sections in tree view
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    asset: true,
    liability: true,
    equity: true,
    revenue: true,
    expense: true,
    cogs: true,
  });

  // Form states
  const [createForm, setCreateForm] = useState({
    code: '',
    name: '',
    type: 'expense',
    subtype: '',
    normal_balance: 'debit',
    allow_direct_posting: true,
  });

  const [editForm, setEditForm] = useState({
    name: '',
    subtype: '',
    normal_balance: 'debit',
    allow_direct_posting: true,
    isActive: true,
  });

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType) params.type = filterType;
      if (showInactive) params.includeInactive = 'true';

      const response = await chartOfAccountsApi.getAll(params);
      if (response.success) {
        setAccounts(response.data || []);
        setGrouped(response.grouped || {});
      }
    } catch (error) {
      console.error('[ChartOfAccountsPage] Failed to fetch accounts:', error);
      toast.error('Failed to load chart of accounts');
    } finally {
      setLoading(false);
    }
  }, [filterType, showInactive]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreate = async () => {
    if (!createForm.code || !createForm.name || !createForm.type) {
      toast.error('Please fill in all required fields');
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
        toast.success('Account created successfully');
        setShowCreateDialog(false);
        setCreateForm({
          code: '',
          name: '',
          type: 'expense',
          subtype: '',
          normal_balance: 'debit',
          allow_direct_posting: true,
        });
        fetchAccounts();
      } else {
        toast.error(response.message || 'Failed to create account');
      }
    } catch (error: any) {
      console.error('[ChartOfAccountsPage] Create error:', error);
      toast.error(error.message || error.response?.data?.message || 'Failed to create account');
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
        toast.success('Account updated successfully');
        setShowEditDialog(false);
        setSelectedAccount(null);
        fetchAccounts();
      } else {
        toast.error('Failed to update account');
      }
    } catch (error: any) {
      console.error('[ChartOfAccountsPage] Update error:', error);
      toast.error(error.message || error.response?.data?.message || 'Failed to update account');
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
          toast.warning(response.message || 'Account deactivated (has journal entries)');
        } else {
          toast.success('Account deleted successfully');
        }
        setShowDeleteDialog(false);
        setSelectedAccount(null);
        fetchAccounts();
      } else {
        toast.error('Failed to delete account');
      }
    } catch (error: any) {
      console.error('[ChartOfAccountsPage] Delete error:', error);
      toast.error(error.message || error.response?.data?.message || 'Failed to delete account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (account: ChartOfAccountItem) => {
    setSubmitting(true);
    try {
      const response = await chartOfAccountsApi.reactivate(account._id);
      if (response.success) {
        toast.success('Account reactivated successfully');
        fetchAccounts();
      } else {
        toast.error('Failed to reactivate account');
      }
    } catch (error: any) {
      console.error('[ChartOfAccountsPage] Reactivate error:', error);
      toast.error(error.message || 'Failed to reactivate account');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (account: ChartOfAccountItem) => {
    setSelectedAccount(account);
    setEditForm({
      name: account.name,
      subtype: account.subtype || '',
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

  const toggleSection = (type: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Filter accounts by search query
  const filterBySearch = (accountList: ChartOfAccountItem[]) => {
    if (!searchQuery) return accountList;
    const query = searchQuery.toLowerCase();
    return accountList.filter(
      acc => acc.code.toLowerCase().includes(query) || acc.name.toLowerCase().includes(query)
    );
  };

  const renderAccountRow = (account: ChartOfAccountItem) => (
    <TableRow key={account._id} className={!account.isActive ? 'opacity-50' : ''}>
      <TableCell className="font-mono font-medium">{account.code}</TableCell>
      <TableCell>{account.name}</TableCell>
      <TableCell>
        <Badge className={`${typeColors[account.type] || 'bg-gray-500'} text-white`}>
          {account.type}
        </Badge>
      </TableCell>
      <TableCell>{account.subtype || '-'}</TableCell>
      <TableCell>
        <Badge variant={account.normal_balance === 'debit' ? 'default' : 'secondary'}>
          {account.normal_balance}
        </Badge>
      </TableCell>
      <TableCell>
        {account.allow_direct_posting ? (
          <ToggleRight className="h-5 w-5 text-green-500" />
        ) : (
          <ToggleLeft className="h-5 w-5 text-gray-400" />
        )}
      </TableCell>
      <TableCell>
        {account.isActive ? (
          <Badge className="bg-green-500 text-white">Active</Badge>
        ) : (
          <Badge variant="outline" className="text-gray-500">Inactive</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditDialog(account)}
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
          {account.isActive ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openDeleteDialog(account)}
              title="Deactivate"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleReactivate(account)}
              title="Reactivate"
            >
              <RefreshCw className="h-4 w-4 text-green-500" />
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
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors"
          onClick={() => toggleSection(type)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-600" />
          )}
          <Badge className={`${typeColors[type] || 'bg-gray-500'} text-white`}>
            {typeLabels[type] || type}
          </Badge>
          <span className="text-sm text-slate-600">
            {totalBalance} account{totalBalance !== 1 ? 's' : ''}
          </span>
        </div>

        {isExpanded && (
          <Table className="mt-2">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subtype</TableHead>
                <TableHead>Normal Bal.</TableHead>
                <TableHead>Direct Post</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectionAccounts.map(renderAccountRow)}
            </TableBody>
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
            <BookOpen className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold">Chart of Accounts</h1>
              <p className="text-muted-foreground">Manage your accounting structure</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="asset">Assets</SelectItem>
                  <SelectItem value="liability">Liabilities</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="cogs">COGS</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Show Inactive</span>
              </label>
              <Button variant="outline" onClick={fetchAccounts}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tree View */}
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No accounts found
              </div>
            ) : (
              <div>
                {['asset', 'liability', 'equity', 'revenue', 'expense', 'cogs'].map(renderSection)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="mt-4 text-sm text-muted-foreground">
          Total: {accounts.length} accounts | Active: {accounts.filter(a => a.isActive).length} | Inactive: {accounts.filter(a => !a.isActive).length}
        </div>

        {/* Create Account Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
              <DialogDescription>
                Create a new chart of account. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input
                    placeholder="e.g., 6100"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={createForm.type}
                    onValueChange={(v) => setCreateForm({ ...createForm, type: v, normal_balance: ['asset', 'expense', 'cogs'].includes(v) ? 'debit' : 'credit' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="cogs">COGS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="Account name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subtype</Label>
                  <Input
                    placeholder="e.g., current, operating"
                    value={createForm.subtype}
                    onChange={(e) => setCreateForm({ ...createForm, subtype: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Normal Balance</Label>
                  <Select
                    value={createForm.normal_balance}
                    onValueChange={(v) => setCreateForm({ ...createForm, normal_balance: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">Debit</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowDirectPosting"
                  checked={createForm.allow_direct_posting}
                  onChange={(e) => setCreateForm({ ...createForm, allow_direct_posting: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="allowDirectPosting" className="cursor-pointer">
                  Allow Direct Posting
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Account Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
              <DialogDescription>
                Update account details. Code cannot be changed.
              </DialogDescription>
            </DialogHeader>
            {selectedAccount && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input value={selectedAccount.code} disabled className="bg-slate-100" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Input value={selectedAccount.type} disabled className="bg-slate-100" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subtype</Label>
                    <Input
                      value={editForm.subtype}
                      onChange={(e) => setEditForm({ ...editForm, subtype: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Normal Balance</Label>
                    <Select
                      value={editForm.normal_balance}
                      onValueChange={(v) => setEditForm({ ...editForm, normal_balance: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Debit</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.allow_direct_posting}
                      onChange={(e) => setEditForm({ ...editForm, allow_direct_posting: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>Allow Direct Posting</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate Account</DialogTitle>
              <DialogDescription>
                {selectedAccount && (
                  <>
                    Are you sure you want to deactivate account <strong>{selectedAccount.code} - {selectedAccount.name}</strong>?
                    <br /><br />
                    If this account has journal entries, it will be deactivated instead of deleted. You can reactivate it later.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
