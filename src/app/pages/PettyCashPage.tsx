import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Wallet, 
  Plus, 
  RefreshCw, 
  FileText, 
  TrendingDown, 
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Download,
  Filter,
  Trash2,
  Edit,
  Eye,
  Building2
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/app/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/app/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useCurrency } from '@/contexts/CurrencyContext';
import { pettyCashApi, bankAccountsApi, type PettyCashFloat, type PettyCashExpense, type PettyCashReplenishment, type PettyCashSummary, type PettyCashReport } from '@/lib/api';
import { Layout } from '../layout/Layout';

// Expense categories
const EXPENSE_CATEGORIES = [
  { value: 'transport', label: 'transport' },
  { value: 'office_supplies', label: 'officeSupplies' },
  { value: 'meals', label: 'meals' },
  { value: 'communications', label: 'communications' },
  { value: 'utilities', label: 'utilities' },
  { value: 'maintenance', label: 'maintenance' },
  { value: 'postage', label: 'postage' },
  { value: 'stationery', label: 'stationery' },
  { value: 'refreshments', label: 'refreshments' },
  { value: 'medical', label: 'medical' },
  { value: 'miscellaneous', label: 'miscellaneous' },
  { value: 'other', label: 'other' },
];

// Status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500';
    case 'approved': return 'bg-green-500';
    case 'rejected': return 'bg-red-500';
    case 'completed': return 'bg-blue-500';
    case 'reimbursed': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
};

export default function PettyCashPage() {
  const { t } = useTranslation();
  const { displayCurrency, formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summary, setSummary] = useState<PettyCashSummary | null>(null);
  const [floats, setFloats] = useState<PettyCashFloat[]>([]);
  const [expenses, setExpenses] = useState<PettyCashExpense[]>([]);
  const [replenishments, setReplenishments] = useState<PettyCashReplenishment[]>([]);
  const [report, setReport] = useState<PettyCashReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);
  const [completeReplDialogOpen, setCompleteReplDialogOpen] = useState(false);
  const [selectedReplenishment, setSelectedReplenishment] = useState<any>(null);
  const [completeForm, setCompleteForm] = useState({
    actualAmount: 0,
    sourceType: 'bank' as 'bank' | 'cash',
    bankAccountId: ''
  });
  
  // Dialog states
  const [floatDialogOpen, setFloatDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [replenishmentDialogOpen, setReplenishmentDialogOpen] = useState(false);
  const [selectedFloat, setSelectedFloat] = useState<string>('');
  
  // Form states
  const [floatForm, setFloatForm] = useState({
    name: '',
    openingBalance: 0,
    minimumBalance: 10000,
    location: '',
    notes: '',
    sourceType: 'bank' as 'bank' | 'cash',
    bankAccountId: ''
  });
  
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: 0,
    category: 'miscellaneous',
    date: new Date().toISOString().split('T')[0],
    receiptNumber: '',
    notes: ''
  });
  
  const [replenishmentForm, setReplenishmentForm] = useState({
    amount: 0,
    reason: ''
  });

  // Load data
  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'floats') loadFloats();
    if (activeTab === 'expenses') loadExpenses();
    if (activeTab === 'replenishments') loadReplenishments();
    if (activeTab === 'report') loadReport();
  }, [activeTab]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const response = await pettyCashApi.getSummary();
      if (response.success) {
        setSummary(response.data);
        if (response.data.floats.length > 0 && !selectedFloat) {
          setSelectedFloat(response.data.floats[0]._id);
        }
      }
    } catch (err) {
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadFloats = async () => {
    try {
      const response = await pettyCashApi.getFloats();
      if (response.success) {
        setFloats(response.data);
      }
    } catch (err) {
      setError(t('errors.loadFailed'));
    }
  };

  const loadExpenses = async () => {
    try {
      const params: any = {};
      if (selectedFloat) params.floatId = selectedFloat;
      const response = await pettyCashApi.getExpenses(params);
      if (response.success) {
        setExpenses(response.data);
      }
    } catch (err) {
      setError(t('errors.loadFailed'));
    }
  };

  const loadReplenishments = async () => {
    try {
      const params: any = {};
      if (selectedFloat) params.floatId = selectedFloat;
      const response = await pettyCashApi.getReplenishments(params);
      if (response.success) {
        setReplenishments(response.data);
      }
    } catch (err) {
      setError(t('errors.loadFailed'));
    }
  };

  const loadReport = async () => {
    try {
      const params: any = {};
      if (selectedFloat) params.floatId = selectedFloat;
      const response = await pettyCashApi.getReport(params);
      if (response.success) {
        setReport(response.data);
      }
    } catch (err) {
      setError(t('errors.loadFailed'));
    }
  };

  const handleCreateFloat = async () => {
    try {
      // custodian is automatically assigned from current user in backend
      await pettyCashApi.createFloat({
        name: floatForm.name,
        openingBalance: floatForm.openingBalance,
        minimumBalance: floatForm.minimumBalance,
        location: floatForm.location,
        notes: floatForm.notes,
        sourceType: floatForm.sourceType,
        bankAccountId: floatForm.sourceType === 'bank' ? floatForm.bankAccountId : undefined
      });
      setFloatDialogOpen(false);
      setFloatForm({ name: '', openingBalance: 0, minimumBalance: 10000, location: '', notes: '', sourceType: 'bank', bankAccountId: '' });
    } catch (err) {
      setError(t('errors.saveFailed'));
    }
  };

  const fetchBankAccounts = async () => {
    setLoadingBankAccounts(true);
    try {
      const response = await bankAccountsApi.getAll();
      if (response.success) {
        setBankAccounts(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
    } finally {
      setLoadingBankAccounts(false);
    }
  };

  const openFloatDialog = () => {
    fetchBankAccounts();
    setFloatDialogOpen(true);
  };

  const handleCreateExpense = async () => {
    try {
      await pettyCashApi.createExpense({
        ...expenseForm,
        float: selectedFloat
      });
      setExpenseDialogOpen(false);
      setExpenseForm({
        description: '',
        amount: 0,
        category: 'miscellaneous',
        date: new Date().toISOString().split('T')[0],
        receiptNumber: '',
        notes: ''
      });
      loadExpenses();
      loadSummary();
    } catch (err) {
      setError(t('errors.saveFailed'));
    }
  };

  const handleCreateReplenishment = async () => {
    try {
      await pettyCashApi.createReplenishment({
        ...replenishmentForm,
        float: selectedFloat
      });
      setReplenishmentDialogOpen(false);
      setReplenishmentForm({ amount: 0, reason: '' });
      loadReplenishments();
      loadSummary();
    } catch (err) {
      setError(t('errors.saveFailed'));
    }
  };

  const handleApproveExpense = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await pettyCashApi.approveExpense(id, { status });
      loadExpenses();
      loadSummary();
    } catch (err) {
      setError(t('errors.updateFailed'));
    }
  };

  const handleCompleteReplenishment = async (id: string, actualAmount: number) => {
    fetchBankAccounts();
    setSelectedReplenishment({ id, actualAmount });
    setCompleteForm({ actualAmount, sourceType: 'bank', bankAccountId: '' });
    setCompleteReplDialogOpen(true);
  };

  const confirmCompleteReplenishment = async () => {
    if (!selectedReplenishment) return;
    try {
      await pettyCashApi.completeReplenishment(selectedReplenishment.id, {
        actualAmount: completeForm.actualAmount,
        sourceType: completeForm.sourceType,
        bankAccountId: completeForm.sourceType === 'bank' ? completeForm.bankAccountId : undefined
      });
      setCompleteReplDialogOpen(false);
      setSelectedReplenishment(null);
      loadReplenishments();
      loadSummary();
    } catch (err) {
      setError(t('errors.updateFailed'));
    }
  };

  const handleApproveReplenishment = async (id: string) => {
    try {
      await pettyCashApi.approveReplenishment(id);
      loadReplenishments();
    } catch (err) {
      setError(t('errors.updateFailed'));
    }
  };

  const formatCategory = (category: string) => {
    return t(`pettyCash.categories.${category}`, category.replace(/_/g, ' '));
  };

  if (loading && !summary) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Wallet className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('pettyCash.title')}</h1>
            <p className="text-gray-500">{t('pettyCash.description')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedFloat} onValueChange={setSelectedFloat}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('pettyCash.selectFloat')} />
            </SelectTrigger>
            <SelectContent>
              {summary?.floats.map((float) => (
                <SelectItem key={float._id} value={float._id}>
                  {float.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('pettyCash.currentBalance')}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary?.totals.totalCurrentBalance || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('pettyCash.todayExpenses')}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary?.totals.totalTodayExpenses || 0)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('pettyCash.pendingExpenses')}</p>
                <p className="text-2xl font-bold">
                  {summary?.totals.totalPendingExpenses || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('pettyCash.needsReplenishment')}</p>
                <p className="text-2xl font-bold">
                  {summary?.needsReplenishment || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floats requiring attention */}
      {summary && summary.needsReplenishment > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">{t('pettyCash.replenishmentAlert')}</p>
                <p className="text-sm text-gray-600">
                  {summary.floats.filter(f => f.needsReplenishment).map(f => f.name).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">{t('pettyCash.tabs.dashboard')}</TabsTrigger>
          <TabsTrigger value="floats">{t('pettyCash.tabs.floats')}</TabsTrigger>
          <TabsTrigger value="expenses">{t('pettyCash.tabs.expenses')}</TabsTrigger>
          <TabsTrigger value="replenishments">{t('pettyCash.tabs.replenishments')}</TabsTrigger>
          <TabsTrigger value="report">{t('pettyCash.tabs.report')}</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary?.floats.map((float) => (
              <Card key={float._id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {float.name}
                    {float.needsReplenishment && (
                      <Badge variant="outline" className="bg-orange-100 text-orange-700">
                        {t('pettyCash.needsReplenishment')}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-3 w-3" />
                      {float.custodian?.name}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('pettyCash.openingBalance')}</span>
                      <span className="font-medium">{formatCurrency(float.openingBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('pettyCash.currentBalance')}</span>
                      <span className={`font-medium ${float.currentBalance < float.minimumBalance ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(float.currentBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('pettyCash.todaySpent')}</span>
                      <span className="font-medium">{formatCurrency(float.todayTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('pettyCash.pendingItems')}</span>
                      <span className="font-medium">
                        {float.pendingExpenses + float.pendingReplenishments}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Floats Tab */}
        <TabsContent value="floats">
          <div className="flex justify-between mb-4">
            <Dialog open={floatDialogOpen} onOpenChange={(open) => { if (open) fetchBankAccounts(); setFloatDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('pettyCash.createFloat')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('pettyCash.createFloat')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t('pettyCash.floatName')}</Label>
                    <Input 
                      value={floatForm.name} 
                      onChange={(e) => setFloatForm({...floatForm, name: e.target.value})}
                      placeholder={t('pettyCash.floatNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('pettyCash.openingBalance')}</Label>
                    <Input 
                      type="number"
                      value={floatForm.openingBalance} 
                      onChange={(e) => setFloatForm({...floatForm, openingBalance: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>{t('pettyCash.minimumBalance')}</Label>
                    <Input 
                      type="number"
                      value={floatForm.minimumBalance} 
                      onChange={(e) => setFloatForm({...floatForm, minimumBalance: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>{t('pettyCash.location')}</Label>
                    <Input 
                      value={floatForm.location} 
                      onChange={(e) => setFloatForm({...floatForm, location: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>{t('pettyCash.sourceType')}</Label>
                    <Select 
                      value={floatForm.sourceType} 
                      onValueChange={(value: 'bank' | 'cash') => setFloatForm({...floatForm, sourceType: value, bankAccountId: ''})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">{t('pettyCash.fromBank')}</SelectItem>
                        <SelectItem value="cash">{t('pettyCash.fromCash')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {floatForm.sourceType === 'bank' && (
                    <div>
                      <Label>{t('pettyCash.selectBank')}</Label>
                      <Select 
                        value={floatForm.bankAccountId} 
                        onValueChange={(value) => setFloatForm({...floatForm, bankAccountId: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('pettyCash.selectBankPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((account) => (
                            <SelectItem key={account._id} value={account._id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>{t('pettyCash.notes')}</Label>
                    <Textarea 
                      value={floatForm.notes} 
                      onChange={(e) => setFloatForm({...floatForm, notes: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFloatDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleCreateFloat}>
                    {t('common.save')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pettyCash.floatName')}</TableHead>
                  <TableHead>{t('pettyCash.openingBalance')}</TableHead>
                  <TableHead>{t('pettyCash.currentBalance')}</TableHead>
                  <TableHead>{t('pettyCash.minimumBalance')}</TableHead>
                  <TableHead>{t('pettyCash.custodian')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {floats.map((float) => (
                  <TableRow key={float._id}>
                    <TableCell className="font-medium">{float.name}</TableCell>
                    <TableCell>{formatCurrency(float.openingBalance)}</TableCell>
                    <TableCell>{formatCurrency(float.currentBalance)}</TableCell>
                    <TableCell>{formatCurrency(float.minimumBalance)}</TableCell>
                    <TableCell>{float.custodian?.name}</TableCell>
                    <TableCell>
                      <Badge variant={float.isActive ? 'default' : 'secondary'}>
                        {float.isActive ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <div className="flex justify-between mb-4">
            <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!selectedFloat}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('pettyCash.addExpense')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('pettyCash.addExpense')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t('pettyCash.description')}</Label>
                    <Input 
                      value={expenseForm.description} 
                      onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>{t('pettyCash.amount')}</Label>
                    <Input 
                      type="number"
                      value={expenseForm.amount} 
                      onChange={(e) => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>{t('pettyCash.category')}</Label>
                    <Select 
                      value={expenseForm.category} 
                      onValueChange={(value) => setExpenseForm({...expenseForm, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {formatCategory(cat.value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('pettyCash.date')}</Label>
                    <Input 
                      type="date"
                      value={expenseForm.date} 
                      onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>{t('pettyCash.receiptNumber')}</Label>
                    <Input 
                      value={expenseForm.receiptNumber} 
                      onChange={(e) => setExpenseForm({...expenseForm, receiptNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>{t('pettyCash.notes')}</Label>
                    <Textarea 
                      value={expenseForm.notes} 
                      onChange={(e) => setExpenseForm({...expenseForm, notes: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleCreateExpense}>
                    {t('common.save')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pettyCash.date')}</TableHead>
                  <TableHead>{t('pettyCash.description')}</TableHead>
                  <TableHead>{t('pettyCash.category')}</TableHead>
                  <TableHead>{t('pettyCash.amount')}</TableHead>
                  <TableHead>{t('pettyCash.receiptNumber')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{formatCategory(expense.category)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{expense.receiptNumber || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(expense.status)}>
                        {t(`pettyCash.status.${expense.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {expense.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-green-600"
                            onClick={() => handleApproveExpense(expense._id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-red-600"
                            onClick={() => handleApproveExpense(expense._id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Replenishments Tab */}
        <TabsContent value="replenishments">
          <div className="flex justify-between mb-4">
            <Dialog open={replenishmentDialogOpen} onOpenChange={setReplenishmentDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!selectedFloat}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('pettyCash.requestReplenishment')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('pettyCash.requestReplenishment')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t('pettyCash.amount')}</Label>
                    <Input 
                      type="number"
                      value={replenishmentForm.amount} 
                      onChange={(e) => setReplenishmentForm({...replenishmentForm, amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>{t('pettyCash.reason')}</Label>
                    <Textarea 
                      value={replenishmentForm.reason} 
                      onChange={(e) => setReplenishmentForm({...replenishmentForm, reason: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReplenishmentDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleCreateReplenishment}>
                    {t('common.save')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Complete Replenishment Dialog */}
          <Dialog open={completeReplDialogOpen} onOpenChange={(open) => { if (open) fetchBankAccounts(); setCompleteReplDialogOpen(open); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('pettyCash.completeReplenishment')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('pettyCash.actualAmount')}</Label>
                  <Input 
                    type="number"
                    value={completeForm.actualAmount} 
                    onChange={(e) => setCompleteForm({...completeForm, actualAmount: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>{t('pettyCash.sourceType')}</Label>
                  <Select 
                    value={completeForm.sourceType} 
                    onValueChange={(value: 'bank' | 'cash') => setCompleteForm({...completeForm, sourceType: value, bankAccountId: ''})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">{t('pettyCash.fromBank')}</SelectItem>
                      <SelectItem value="cash">{t('pettyCash.fromCash')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {completeForm.sourceType === 'bank' && (
                  <div>
                    <Label>{t('pettyCash.selectBank')}</Label>
                    <Select 
                      value={completeForm.bankAccountId} 
                      onValueChange={(value) => setCompleteForm({...completeForm, bankAccountId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('pettyCash.selectBankPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account._id} value={account._id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCompleteReplDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={confirmCompleteReplenishment}>
                  {t('common.confirm')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pettyCash.replenishmentNumber')}</TableHead>
                  <TableHead>{t('pettyCash.float')}</TableHead>
                  <TableHead>{t('pettyCash.amount')}</TableHead>
                  <TableHead>{t('pettyCash.reason')}</TableHead>
                  <TableHead>{t('pettyCash.requestedBy')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {replenishments.map((repl) => (
                  <TableRow key={repl._id}>
                    <TableCell className="font-medium">{repl.replenishmentNumber || repl._id}</TableCell>
                    <TableCell>{repl.float?.name}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(repl.amount)}</TableCell>
                    <TableCell>{repl.reason || '-'}</TableCell>
                    <TableCell>{repl.requestedBy?.name}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(repl.status)}>
                        {t(`pettyCash.status.${repl.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {repl.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-green-600"
                            onClick={() => handleApproveReplenishment(repl._id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {repl.status === 'approved' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleCompleteReplenishment(repl._id, repl.amount)}
                        >
                          {t('pettyCash.complete')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report">
          <div className="flex justify-between mb-4">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
          </div>

          {report && (
            <>
              {/* Grand Total */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{t('pettyCash.grandTotal')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">{t('pettyCash.openingBalance')}</p>
                      <p className="text-xl font-bold">{formatCurrency(report.grandTotal.openingBalance)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('pettyCash.totalExpenses')}</p>
                      <p className="text-xl font-bold text-red-600">{formatCurrency(report.grandTotal.totalExpenses)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('pettyCash.totalReplenishments')}</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(report.grandTotal.totalReplenishments)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('pettyCash.currentBalance')}</p>
                      <p className="text-xl font-bold">{formatCurrency(report.grandTotal.currentBalance)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('pettyCash.expenseCount')}</p>
                      <p className="text-xl font-bold">{report.grandTotal.expenseCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* By Category */}
              {report.report.map((r, idx) => (
                <Card key={idx} className="mb-4">
                  <CardHeader>
                    <CardTitle>{r.float.name}</CardTitle>
                    <CardDescription>
                      {t('pettyCash.custodian')}: {r.float.custodian?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">{t('pettyCash.openingBalance')}</p>
                        <p className="font-medium">{formatCurrency(r.summary.openingBalance)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('pettyCash.totalExpenses')}</p>
                        <p className="font-medium text-red-600">{formatCurrency(r.summary.totalExpenses)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('pettyCash.currentBalance')}</p>
                        <p className="font-medium">{formatCurrency(r.summary.currentBalance)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('pettyCash.expenseCount')}</p>
                        <p className="font-medium">{r.summary.expenseCount}</p>
                      </div>
                    </div>

                    {/* Expenses by category */}
                    {r.expensesByCategory.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">{t('pettyCash.expensesByCategory')}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {r.expensesByCategory.map((cat, cidx) => (
                            <div key={cidx} className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{formatCategory(cat.category)}</span>
                              <span className="font-medium">{formatCurrency(cat.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
}
