import React, { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { budgetsApi, Budget, BudgetComparison } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Calculator, 
  Plus, 
  Pencil, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  FileText,
  BarChart3,
  AlertCircle,
  DollarSign,
  Wallet,
  PiggyBank
} from 'lucide-react';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [comparisonData, setComparisonData] = useState<BudgetComparison | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [allComparisons, setAllComparisons] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Forecasting state
  const [forecastMonths, setForecastMonths] = useState(6);
  const [revenueForecast, setRevenueForecast] = useState<any>(null);
  const [expenseForecast, setExpenseForecast] = useState<any>(null);
  const [cashFlowForecast, setCashFlowForecast] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'revenue' as 'revenue' | 'expense' | 'profit',
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    periodType: 'monthly' as 'monthly' | 'quarterly' | 'yearly' | 'custom',
    amount: 0,
    department: '',
    notes: '',
    items: [] as Array<{
      category: string;
      subcategory: string;
      description: string;
      budgetedAmount: number;
    }>
  });

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    category: 'sales',
    subcategory: '',
    description: '',
    budgetedAmount: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch budgets
      const budgetsRes = await budgetsApi.getAll({ limit: 100 });
      setBudgets(budgetsRes.data);
      
      // Fetch summary
      try {
        const summaryRes = await budgetsApi.getSummary();
        setSummary(summaryRes.data);
      } catch (sumErr) {
        console.error('Failed to fetch summary:', sumErr);
      }
      
      // Fetch all comparisons
      try {
        const comparisonsRes = await budgetsApi.getAllComparisons();
        setAllComparisons(comparisonsRes.data);
      } catch (compErr) {
        console.error('Failed to fetch comparisons:', compErr);
      }
      
    } catch (err: any) {
      setError(err?.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const fetchForecasts = async () => {
    setForecastLoading(true);
    try {
      const [revenueRes, expenseRes, cashFlowRes] = await Promise.all([
        budgetsApi.getRevenueForecast(forecastMonths),
        budgetsApi.getExpenseForecast(forecastMonths),
        budgetsApi.getCashFlowForecast(forecastMonths)
      ]);
      setRevenueForecast(revenueRes.data);
      setExpenseForecast(expenseRes.data);
      setCashFlowForecast(cashFlowRes.data);
    } catch (err: any) {
      console.error('Failed to fetch forecasts:', err);
    } finally {
      setForecastLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'forecast') {
      fetchForecasts();
    }
  }, [activeTab, forecastMonths]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await budgetsApi.update(editingBudget._id, formData);
      } else {
        await budgetsApi.create(formData);
      }
      setIsDialogOpen(false);
      setEditingBudget(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save budget');
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      description: budget.description || '',
      type: budget.type,
      periodStart: new Date(budget.periodStart).toISOString().split('T')[0],
      periodEnd: new Date(budget.periodEnd).toISOString().split('T')[0],
      periodType: budget.periodType,
      amount: budget.amount,
      department: budget.department || '',
      notes: budget.notes || '',
      items: budget.items?.map(item => ({
        category: item.category,
        subcategory: item.subcategory || '',
        description: item.description || '',
        budgetedAmount: item.budgetedAmount
      })) || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    try {
      await budgetsApi.delete(id);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete budget');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await budgetsApi.approve(id);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve budget');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason (optional):');
    try {
      await budgetsApi.reject(id, reason || undefined);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to reject budget');
    }
  };

  const handleCompare = async (budget: Budget) => {
    setSelectedBudget(budget);
    setIsCompareDialogOpen(true);
    try {
      const res = await budgetsApi.getComparison(budget._id);
      setComparisonData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load comparison');
    }
  };

  const handleClone = async (budget: Budget) => {
    const newName = prompt('Enter name for cloned budget:', `${budget.name} (Copy)`);
    if (!newName) return;
    
    const startDate = new Date(budget.periodEnd);
    startDate.setDate(startDate.getDate() + 1);
    const defaultStart = startDate.toISOString().split('T')[0];
    
    const endDate = new Date(defaultStart);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    const defaultEnd = endDate.toISOString().split('T')[0];
    
    const newStart = prompt('Enter new period start (YYYY-MM-DD):', defaultStart);
    if (!newStart) return;
    
    const newEndDate = new Date(newStart);
    newEndDate.setMonth(newEndDate.getMonth() + 1);
    newEndDate.setDate(0);
    const newEnd = prompt('Enter new period end (YYYY-MM-DD):', newEndDate.toISOString().split('T')[0]);
    if (!newEnd) return;
    
    try {
      await budgetsApi.clone(budget._id, {
        newName,
        newPeriodStart: newStart,
        newPeriodEnd: newEnd
      });
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to clone budget');
    }
  };

  const resetForm = () => {
    const now = new Date();
    setFormData({
      name: '',
      description: '',
      type: 'revenue',
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      periodType: 'monthly',
      amount: 0,
      department: '',
      notes: '',
      items: []
    });
  };

  const openNewDialog = () => {
    setEditingBudget(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ...newItem }]
    });
    setNewItem({
      category: 'sales',
      subcategory: '',
      description: '',
      budgetedAmount: 0
    });
    setIsAddItemOpen(false);
    
    // Recalculate total
    const total = formData.items.reduce((sum, item) => sum + item.budgetedAmount, 0) + newItem.budgetedAmount;
    setFormData(prev => ({ ...prev, amount: total }));
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
    
    // Recalculate total
    const total = newItems.reduce((sum, item) => sum + item.budgetedAmount, 0);
    setFormData(prev => ({ ...prev, amount: total }));
  };

  // Filter budgets
  const filteredBudgets = budgets.filter(budget => {
    const matchesSearch = budget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.budgetId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || budget.status === filterStatus;
    const matchesType = filterType === 'all' || budget.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Active</span>;
      case 'draft':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 flex items-center gap-1"><Clock className="h-3 w-3" /> Draft</span>;
      case 'closed':
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 flex items-center gap-1"><FileText className="h-3 w-3" /> Closed</span>;
      case 'cancelled':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center gap-1"><XCircle className="h-3 w-3" /> Cancelled</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</span>;
      case 'rejected':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Budget Management
          </h1>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Budget
          </Button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
            <button onClick={() => setError(null)} className="absolute top-0 right-0 px-4 py-3">×</button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">Budgets List</TabsTrigger>
            <TabsTrigger value="summary">Dashboard</TabsTrigger>
            <TabsTrigger value="comparison">All Comparisons</TabsTrigger>
            <TabsTrigger value="forecast">Forecasting</TabsTrigger>
          </TabsList>

          {/* BUDGETS LIST TAB */}
          <TabsContent value="list">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <Input
                placeholder="Search budgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="profit">Profit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Budgets Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : filteredBudgets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No budgets found. Click "Create Budget" to add one.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Budget ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approval</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBudgets.map((budget) => (
                        <TableRow key={budget._id}>
                          <TableCell className="font-mono text-xs">{budget.budgetId}</TableCell>
                          <TableCell className="font-medium">{budget.name}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              budget.type === 'revenue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              budget.type === 'expense' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            }`}>
                              {budget.type.charAt(0).toUpperCase() + budget.type.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(budget.periodStart)} - {formatDate(budget.periodEnd)}
                          </TableCell>
                          <TableCell className="font-semibold">{formatCurrency(budget.amount)}</TableCell>
                          <TableCell>{getStatusBadge(budget.status)}</TableCell>
                          <TableCell>{getApprovalBadge(budget.approvalStatus)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleCompare(budget)}
                                title="Compare vs Actual"
                              >
                                <BarChart3 className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleClone(budget)}
                                title="Clone Budget"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              {budget.approvalStatus === 'pending' && budget.status === 'draft' && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleApprove(budget._id)}
                                    title="Approve"
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleReject(budget._id)}
                                    title="Reject"
                                  >
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  </Button>
                                </>
                              )}
                              {budget.status !== 'closed' && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(budget)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(budget._id)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DASHBOARD TAB */}
          <TabsContent value="summary">
            <div className="space-y-4">
              {/* Summary Cards */}
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Active Budgets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary.status?.total || 0}</div>
                      <p className="text-xs text-muted-foreground">{summary.status?.onTrack || 0} on track, {summary.status?.exceeded || 0} exceeded</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summary.totals?.totalBudgeted || 0)}</div>
                      <p className="text-xs text-muted-foreground">All active budgets</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summary.totals?.totalActual || 0)}</div>
                      <p className="text-xs text-muted-foreground">Spent/Received</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Variance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${(summary.totals?.totalVariance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(summary.totals?.totalVariance || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Budget Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Budget Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary?.budgets?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No active budgets</div>
                  ) : (
                    <div className="space-y-4">
                      {summary?.budgets?.map((budget: any) => (
                        <div key={budget._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{budget.name}</span>
                              {budget.isOnTrack ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{budget.type} • {formatCurrency(budget.budgetedAmount)} budgeted</p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(budget.actualAmount)}</div>
                            <div className="text-xs text-muted-foreground">{budget.utilization}% utilized</div>
                          </div>
                          <div className="w-32 ml-4">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${budget.isOnTrack ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(budget.utilization, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ALL COMPARISONS TAB */}
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>All Budget Comparisons</CardTitle>
              </CardHeader>
              <CardContent>
                {allComparisons.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No budgets to compare</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Budget</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Budgeted</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Variance</TableHead>
                        <TableHead>Utilization</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allComparisons.map((comp) => (
                        <TableRow key={comp._id}>
                          <TableCell className="font-medium">{comp.name}</TableCell>
                          <TableCell>{comp.type}</TableCell>
                          <TableCell className="text-sm">
                            {formatDate(comp.periodStart)} - {formatDate(comp.periodEnd)}
                          </TableCell>
                          <TableCell>{formatCurrency(comp.budgetedAmount)}</TableCell>
                          <TableCell>{formatCurrency(comp.actualAmount)}</TableCell>
                          <TableCell className={comp.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(comp.variance)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500"
                                  style={{ width: `${Math.min(comp.utilizationPercent, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs">{comp.utilizationPercent}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {comp.variance >= 0 ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <TrendingUp className="h-4 w-4" /> On Track
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-600">
                                <TrendingDown className="h-4 w-4" /> Exceeded
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FORECASTING TAB */}
          <TabsContent value="forecast">
            <div className="space-y-4">
              {/* Forecast Period Selector */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Budgets & Forecasting</h2>
                <div className="flex items-center gap-2">
                  <Label>Forecast Period:</Label>
                  <Select value={String(forecastMonths)} onValueChange={(v) => setForecastMonths(Number(v))}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={fetchForecasts} disabled={forecastLoading}>
                    Refresh
                  </Button>
                </div>
              </div>

              {forecastLoading ? (
                <div className="text-center py-8">Loading forecasts...</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Revenue Forecast */}
                  <Card className="col-span-1">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Revenue Forecast
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {revenueForecast && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Avg. Monthly</span>
                            <span className="font-semibold">{formatCurrency(revenueForecast.summary.averageMonthlyRevenue)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{forecastMonths} Month Total</span>
                            <span className="font-semibold text-green-600">{formatCurrency(revenueForecast.summary.totalProjected)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Trend</span>
                            <span className={`flex items-center gap-1 ${revenueForecast.summary.trendDirection === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                              {revenueForecast.summary.trendDirection === 'positive' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                              {revenueForecast.summary.trend > 0 ? '+' : ''}{formatCurrency(revenueForecast.summary.trend)}/mo
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground pt-2">
                            Based on {revenueForecast.summary.dataPoints} months of data
                          </div>
                          
                          {/* Forecast Table */}
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Projected Revenue</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Month</TableHead>
                                  <TableHead>Projected</TableHead>
                                  <TableHead>Confidence</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {revenueForecast.forecast.slice(0, 6).map((item: any, idx: number) => (
                                  <TableRow key={idx}>
                                    <TableCell className="text-sm">{item.monthName} {item.year}</TableCell>
                                    <TableCell className="font-medium">{formatCurrency(item.projectedRevenue)}</TableCell>
                                    <TableCell>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        item.confidence === 'high' ? 'bg-green-100 text-green-800' :
                                        item.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {item.confidence}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Expense Forecast */}
                  <Card className="col-span-1">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-red-600" />
                        Expense Forecast
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {expenseForecast && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Avg. Monthly</span>
                            <span className="font-semibold">{formatCurrency(expenseForecast.summary.averageMonthlyExpense)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{forecastMonths} Month Total</span>
                            <span className="font-semibold text-red-600">{formatCurrency(expenseForecast.summary.totalProjected)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Trend</span>
                            <span className={`flex items-center gap-1 ${expenseForecast.summary.trendDirection === 'decreasing' ? 'text-green-600' : 'text-red-600'}`}>
                              {expenseForecast.summary.trendDirection === 'decreasing' ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                              {expenseForecast.summary.trend > 0 ? '+' : ''}{formatCurrency(expenseForecast.summary.trend)}/mo
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground pt-2">
                            Based on {expenseForecast.summary.dataPoints} months of data
                          </div>
                          
                          {/* Forecast Table */}
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Projected Expenses</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Month</TableHead>
                                  <TableHead>Projected</TableHead>
                                  <TableHead>Confidence</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {expenseForecast.forecast.slice(0, 6).map((item: any, idx: number) => (
                                  <TableRow key={idx}>
                                    <TableCell className="text-sm">{item.monthName} {item.year}</TableCell>
                                    <TableCell className="font-medium">{formatCurrency(item.projectedExpense)}</TableCell>
                                    <TableCell>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        item.confidence === 'high' ? 'bg-green-100 text-green-800' :
                                        item.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {item.confidence}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Cash Flow Forecast */}
                  <Card className="col-span-1">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <PiggyBank className="h-5 w-5 text-blue-600" />
                        Cash Flow Forecast
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {cashFlowForecast && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Current Receivables</span>
                            <span className="font-semibold text-green-600">{formatCurrency(cashFlowForecast.currentPosition.receivables)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Current Payables</span>
                            <span className="font-semibold text-red-600">{formatCurrency(cashFlowForecast.currentPosition.payables)}</span>
                          </div>
                          <div className="flex justify-between items-center border-t pt-2">
                            <span className="text-sm text-muted-foreground">Net Position</span>
                            <span className={`font-semibold ${cashFlowForecast.currentPosition.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(cashFlowForecast.currentPosition.netPosition)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-t pt-2">
                            <span className="text-sm text-muted-foreground">{forecastMonths} Month Net Cash Flow</span>
                            <span className={`font-semibold ${cashFlowForecast.summary.projectedNetCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(cashFlowForecast.summary.projectedNetCashFlow)}
                            </span>
                          </div>
                          
                          {/* Cash Flow Table */}
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Monthly Cash Flow</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Month</TableHead>
                                  <TableHead>Net Flow</TableHead>
                                  <TableHead>Cumulative</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {cashFlowForecast.forecast.slice(0, 6).map((item: any, idx: number) => (
                                  <TableRow key={idx}>
                                    <TableCell className="text-sm">{item.monthName} {item.year}</TableCell>
                                    <TableCell className={`font-medium ${item.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatCurrency(item.netCashFlow)}
                                    </TableCell>
                                    <TableCell className={`${item.cumulativeCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatCurrency(item.cumulativeCashFlow)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBudget ? 'Edit Budget' : 'Create New Budget'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Budget Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Q1 2024 Revenue Budget"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Budget Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'revenue' | 'expense' | 'profit') => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="profit">Profit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this budget"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="periodType">Period Type</Label>
                    <Select
                      value={formData.periodType}
                      onValueChange={(value: 'monthly' | 'quarterly' | 'yearly' | 'custom') => setFormData({ ...formData, periodType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g., Sales, Marketing"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="periodStart">Period Start *</Label>
                    <Input
                      id="periodStart"
                      type="date"
                      value={formData.periodStart}
                      onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="periodEnd">Period End *</Label>
                    <Input
                      id="periodEnd"
                      type="date"
                      value={formData.periodEnd}
                      onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Total Budget Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                {/* Budget Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Budget Categories (Optional)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsAddItemOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Add Category
                    </Button>
                  </div>
                  {formData.items.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{formatCurrency(item.budgetedAmount)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBudget ? 'Update' : 'Create'} Budget
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Item Dialog */}
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Budget Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newItem.category}
                  onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="purchases">Purchases</SelectItem>
                    <SelectItem value="operating_expenses">Operating Expenses</SelectItem>
                    <SelectItem value="payroll">Payroll</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Input
                  value={newItem.subcategory}
                  onChange={(e) => setNewItem({ ...newItem, subcategory: e.target.value })}
                  placeholder="Optional subcategory"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Item description"
                />
              </div>
              <div className="space-y-2">
                <Label>Budgeted Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.budgetedAmount}
                  onChange={(e) => setNewItem({ ...newItem, budgetedAmount: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
              <Button onClick={handleAddItem}>Add Item</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Comparison Dialog */}
        <Dialog open={isCompareDialogOpen} onOpenChange={setIsCompareDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Budget vs Actual Comparison</DialogTitle>
            </DialogHeader>
            {selectedBudget && comparisonData && (
              <div className="space-y-6 py-4">
                {/* Budget Info */}
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{selectedBudget.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedBudget.budgetId} • {selectedBudget.type.charAt(0).toUpperCase() + selectedBudget.type.slice(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedBudget.periodStart)} - {formatDate(selectedBudget.periodEnd)}
                      </p>
                      {getStatusBadge(selectedBudget.status)}
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                    <p className="text-sm text-blue-600 dark:text-blue-400">Budgeted</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(comparisonData.summary.budgetedAmount)}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                    <p className="text-sm text-green-600 dark:text-green-400">Actual</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(comparisonData.summary.actualAmount)}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${
                    comparisonData.summary.varianceAmount >= 0 
                      ? 'bg-green-50 dark:bg-green-900/20' 
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <p className="text-sm">Variance</p>
                    <p className={`text-2xl font-bold ${
                      comparisonData.summary.varianceAmount >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(comparisonData.summary.varianceAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {comparisonData.summary.variancePercent >= 0 ? 'Under budget' : 'Over budget'} ({Math.abs(comparisonData.summary.variancePercent)}%)
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget Utilization</span>
                    <span>{comparisonData.summary.utilizationPercent}%</span>
                  </div>
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        comparisonData.summary.status === 'on_track' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(comparisonData.summary.utilizationPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Monthly Breakdown */}
                {comparisonData.actual.byMonth.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Monthly Breakdown</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Transactions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparisonData.actual.byMonth.map((month, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{month.year}-{String(month.month).padStart(2, '0')}</TableCell>
                            <TableCell>{formatCurrency(month.amount)}</TableCell>
                            <TableCell>{month.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Category Breakdown */}
                {comparisonData.itemComparisons && comparisonData.itemComparisons.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Category Breakdown</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Budgeted</TableHead>
                          <TableHead>Actual</TableHead>
                          <TableHead>Variance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparisonData.itemComparisons.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.category}</TableCell>
                            <TableCell>{formatCurrency(item.budgetedAmount)}</TableCell>
                            <TableCell>{formatCurrency(item.actualAmount || 0)}</TableCell>
                            <TableCell className={(item.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(item.variance || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
